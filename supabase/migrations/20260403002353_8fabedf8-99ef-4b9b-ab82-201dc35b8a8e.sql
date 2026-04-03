
-- Price tiers per showing
CREATE TABLE public.showing_price_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showing_id uuid NOT NULL REFERENCES public.showings(id) ON DELETE CASCADE,
  tier_name text NOT NULL DEFAULT 'Adult',
  price numeric NOT NULL DEFAULT 8.00,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.showing_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active price tiers"
  ON public.showing_price_tiers FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can insert price tiers"
  ON public.showing_price_tiers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update price tiers"
  ON public.showing_price_tiers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete price tiers"
  ON public.showing_price_tiers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tier reference to tickets
ALTER TABLE public.tickets ADD COLUMN tier_id uuid REFERENCES public.showing_price_tiers(id);

-- Update the pricing trigger to use tier price when available
CREATE OR REPLACE FUNCTION public.enforce_ticket_pricing()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_price numeric;
  v_tax_rate numeric := 0.06;
BEGIN
  -- If a tier is specified, use the tier price; otherwise fall back to showing base price
  IF NEW.tier_id IS NOT NULL THEN
    SELECT price INTO v_ticket_price
    FROM public.showing_price_tiers
    WHERE id = NEW.tier_id AND showing_id = NEW.showing_id;

    IF v_ticket_price IS NULL THEN
      RAISE EXCEPTION 'Invalid tier_id for this showing';
    END IF;
  ELSE
    SELECT ticket_price INTO v_ticket_price
    FROM public.showings
    WHERE id = NEW.showing_id;

    IF v_ticket_price IS NULL THEN
      RAISE EXCEPTION 'Invalid showing_id';
    END IF;
  END IF;

  NEW.price := v_ticket_price;
  NEW.tax_rate := v_tax_rate;
  NEW.tax_amount := ROUND(v_ticket_price * v_tax_rate, 2);
  NEW.total_price := ROUND(v_ticket_price + (v_ticket_price * v_tax_rate), 2);
  NEW.status := 'confirmed';

  RETURN NEW;
END;
$function$;
