
ALTER TABLE public.showings ADD COLUMN requires_seat_selection boolean NOT NULL DEFAULT false;

ALTER TABLE public.tickets ALTER COLUMN seat_id DROP NOT NULL;
