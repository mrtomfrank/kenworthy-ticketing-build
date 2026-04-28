ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.live_performances ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_movies_is_featured ON public.movies(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_live_performances_is_featured ON public.live_performances(is_featured) WHERE is_featured = true;