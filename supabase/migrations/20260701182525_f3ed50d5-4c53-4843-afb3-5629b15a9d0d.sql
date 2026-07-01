ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS lgl_constituent_id text,
  ADD COLUMN IF NOT EXISTS lgl_gift_id text,
  ADD COLUMN IF NOT EXISTS lgl_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS lgl_sync_error text;