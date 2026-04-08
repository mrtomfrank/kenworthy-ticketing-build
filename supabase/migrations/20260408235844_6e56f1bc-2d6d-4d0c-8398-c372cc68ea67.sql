
-- Create subcategory enum
CREATE TYPE public.live_performance_subcategory AS ENUM ('concert', 'stand_up_comedy', 'theatre', 'dance');

-- Rename concerts table to live_performances
ALTER TABLE public.concerts RENAME TO live_performances;

-- Add subcategory column with default 'concert' (existing data was all concerts)
ALTER TABLE public.live_performances ADD COLUMN subcategory public.live_performance_subcategory NOT NULL DEFAULT 'concert';

-- Rename concert_id in showings
ALTER TABLE public.showings RENAME COLUMN concert_id TO live_performance_id;

-- Rename concert_id in host_event_assignments
ALTER TABLE public.host_event_assignments RENAME COLUMN concert_id TO live_performance_id;

-- Rename the FK constraints
ALTER TABLE public.showings RENAME CONSTRAINT showings_concert_id_fkey TO showings_live_performance_id_fkey;
ALTER TABLE public.host_event_assignments RENAME CONSTRAINT host_event_assignments_concert_id_fkey TO host_event_assignments_live_performance_id_fkey;

-- Drop old RLS policies on live_performances (they reference old table name internally but should work - let's recreate for clarity)
DROP POLICY IF EXISTS "Admins can delete concerts" ON public.live_performances;
DROP POLICY IF EXISTS "Admins can insert concerts" ON public.live_performances;
DROP POLICY IF EXISTS "Admins can update concerts" ON public.live_performances;
DROP POLICY IF EXISTS "Anyone can view active concerts" ON public.live_performances;

-- Recreate RLS policies on live_performances
CREATE POLICY "Admins can delete live performances"
ON public.live_performances FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert live performances"
ON public.live_performances FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update live performances"
ON public.live_performances FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active live performances"
ON public.live_performances FOR SELECT
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Update the check constraint on host_event_assignments
ALTER TABLE public.host_event_assignments DROP CONSTRAINT host_must_have_one_production;
ALTER TABLE public.host_event_assignments ADD CONSTRAINT host_must_have_one_production CHECK (
  (event_id IS NOT NULL)::int + (live_performance_id IS NOT NULL)::int + (movie_id IS NOT NULL)::int = 1
);
