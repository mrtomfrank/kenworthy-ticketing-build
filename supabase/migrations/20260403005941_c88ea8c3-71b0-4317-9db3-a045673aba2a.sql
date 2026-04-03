
-- Film pass product definitions
CREATE TABLE public.film_pass_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 60.00,
  initial_balance NUMERIC NOT NULL DEFAULT 60.00,
  expiration_days INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.film_pass_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active film pass types"
  ON public.film_pass_types FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can insert film pass types"
  ON public.film_pass_types FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update film pass types"
  ON public.film_pass_types FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete film pass types"
  ON public.film_pass_types FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_film_pass_types_updated_at
  BEFORE UPDATE ON public.film_pass_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User-owned passes
CREATE TABLE public.user_film_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pass_type_id UUID NOT NULL REFERENCES public.film_pass_types(id) ON DELETE RESTRICT,
  remaining_balance NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'online',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_film_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own passes"
  ON public.user_film_passes FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Authenticated users can purchase passes"
  ON public.user_film_passes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update passes"
  ON public.user_film_passes FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete passes"
  ON public.user_film_passes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Redemption records
CREATE TABLE public.film_pass_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_id UUID NOT NULL REFERENCES public.user_film_passes(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  amount_deducted NUMERIC NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.film_pass_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
  ON public.film_pass_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_film_passes
      WHERE id = film_pass_redemptions.pass_id
      AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
    )
  );

CREATE POLICY "Authenticated users can create redemptions"
  ON public.film_pass_redemptions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_film_passes
      WHERE id = film_pass_redemptions.pass_id
      AND (user_id = auth.uid() OR has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
    )
  );

-- Function to redeem a film pass (deducts balance atomically)
CREATE OR REPLACE FUNCTION public.redeem_film_pass(
  p_pass_id UUID,
  p_ticket_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Lock the pass row and check balance
  SELECT remaining_balance, expires_at INTO v_remaining, v_expires_at
  FROM public.user_film_passes
  WHERE id = p_pass_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Film pass not found';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Film pass has expired';
  END IF;

  IF v_remaining < p_amount THEN
    RAISE EXCEPTION 'Insufficient pass balance. Remaining: %, Required: %', v_remaining, p_amount;
  END IF;

  -- Deduct balance
  UPDATE public.user_film_passes
  SET remaining_balance = remaining_balance - p_amount
  WHERE id = p_pass_id;

  -- Record redemption
  INSERT INTO public.film_pass_redemptions (pass_id, ticket_id, amount_deducted)
  VALUES (p_pass_id, p_ticket_id, p_amount);

  RETURN TRUE;
END;
$$;
