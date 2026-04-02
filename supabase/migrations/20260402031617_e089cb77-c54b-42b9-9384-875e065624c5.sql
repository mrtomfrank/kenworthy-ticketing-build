
-- Create event_ticket_type enum
CREATE TYPE public.event_ticket_type AS ENUM ('ticketed', 'rsvp', 'info_only');

-- ==================== VENUES ====================
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_seats INTEGER NOT NULL DEFAULT 100,
  has_assigned_seating BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== VENUE SEATS ====================
CREATE TABLE public.venue_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  seat_row TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'standard',
  UNIQUE (venue_id, seat_row, seat_number)
);

ALTER TABLE public.venue_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue seats" ON public.venue_seats FOR SELECT USING (true);
CREATE POLICY "Admins can insert venue seats" ON public.venue_seats FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update venue seats" ON public.venue_seats FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete venue seats" ON public.venue_seats FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== EVENTS ====================
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  genre TEXT,
  rating TEXT DEFAULT 'NR',
  ticket_type event_ticket_type NOT NULL DEFAULT 'ticketed',
  rsvp_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== CONCERTS ====================
CREATE TABLE public.concerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  genre TEXT,
  rating TEXT DEFAULT 'NR',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active concerts" ON public.concerts FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Admins can insert concerts" ON public.concerts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update concerts" ON public.concerts FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete concerts" ON public.concerts FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_concerts_updated_at BEFORE UPDATE ON public.concerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== UPDATE SHOWINGS ====================
-- Make movie_id nullable
ALTER TABLE public.showings ALTER COLUMN movie_id DROP NOT NULL;

-- Add new foreign key columns
ALTER TABLE public.showings ADD COLUMN venue_id UUID REFERENCES public.venues(id);
ALTER TABLE public.showings ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.showings ADD COLUMN concert_id UUID REFERENCES public.concerts(id) ON DELETE CASCADE;

-- Remove total_seats and requires_seat_selection from showings (now on venues)
-- We keep them for now for backward compatibility but they'll be superseded by venue settings
