
-- Create a trigger function to enforce correct ticket pricing on insert
CREATE OR REPLACE FUNCTION public.enforce_ticket_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_price numeric;
  v_tax_rate numeric := 0.06;
BEGIN
  -- Get the correct ticket price from the showing
  SELECT ticket_price INTO v_ticket_price
  FROM public.showings
  WHERE id = NEW.showing_id;

  IF v_ticket_price IS NULL THEN
    RAISE EXCEPTION 'Invalid showing_id';
  END IF;

  -- Override user-supplied values with correct ones
  NEW.price := v_ticket_price;
  NEW.tax_rate := v_tax_rate;
  NEW.tax_amount := ROUND(v_ticket_price * v_tax_rate, 2);
  NEW.total_price := ROUND(v_ticket_price + (v_ticket_price * v_tax_rate), 2);
  NEW.status := 'confirmed';

  RETURN NEW;
END;
$$;

-- Attach trigger to tickets table
CREATE TRIGGER enforce_ticket_pricing_on_insert
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ticket_pricing();

-- Fix profiles UPDATE policy to include WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
