
-- Add 'host' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'host';

-- Create host_event_assignments table
CREATE TABLE public.host_event_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  concert_id UUID REFERENCES public.concerts(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT host_must_have_one_production CHECK (
    (event_id IS NOT NULL)::int + (concert_id IS NOT NULL)::int + (movie_id IS NOT NULL)::int = 1
  )
);

ALTER TABLE public.host_event_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view host assignments"
ON public.host_event_assignments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert host assignments"
ON public.host_event_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete host assignments"
ON public.host_event_assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Hosts can view their own assignments
CREATE POLICY "Hosts can view own assignments"
ON public.host_event_assignments FOR SELECT
USING (user_id = auth.uid());

-- Allow hosts to view tickets for their assigned showings
CREATE POLICY "Hosts can view tickets for assigned events"
ON public.tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.showings s
    JOIN public.host_event_assignments ha ON (
      (ha.event_id IS NOT NULL AND ha.event_id = s.event_id) OR
      (ha.concert_id IS NOT NULL AND ha.concert_id = s.concert_id) OR
      (ha.movie_id IS NOT NULL AND ha.movie_id = s.movie_id)
    )
    WHERE s.id = tickets.showing_id AND ha.user_id = auth.uid()
  )
);

-- Allow hosts to view profiles for attendees of their events
CREATE POLICY "Hosts can view attendee profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.showings s ON s.id = t.showing_id
    JOIN public.host_event_assignments ha ON (
      (ha.event_id IS NOT NULL AND ha.event_id = s.event_id) OR
      (ha.concert_id IS NOT NULL AND ha.concert_id = s.concert_id) OR
      (ha.movie_id IS NOT NULL AND ha.movie_id = s.movie_id)
    )
    WHERE t.user_id = profiles.id AND ha.user_id = auth.uid()
  )
);

-- Allow hosts to view showings for their assigned productions
CREATE POLICY "Hosts can view assigned showings"
ON public.showings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.host_event_assignments ha
    WHERE ha.user_id = auth.uid() AND (
      (ha.event_id IS NOT NULL AND ha.event_id = showings.event_id) OR
      (ha.concert_id IS NOT NULL AND ha.concert_id = showings.concert_id) OR
      (ha.movie_id IS NOT NULL AND ha.movie_id = showings.movie_id)
    )
  )
);
