
ALTER TABLE public.rental_requests
  ADD COLUMN IF NOT EXISTS contract_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_status text NOT NULL DEFAULT 'draft';

-- Allow anon (token-bearing renter) to read their own request via secure RPC
CREATE OR REPLACE FUNCTION public.get_rental_request_by_token(p_token text)
RETURNS SETOF public.rental_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.rental_requests
  WHERE invite_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_rental_request_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rental_request_by_token(text) TO anon, authenticated;
