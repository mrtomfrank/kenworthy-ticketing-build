
-- 1. Color on existing showing price tiers
ALTER TABLE public.showing_price_tiers
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#9C3FA0';

-- 2. Production-level tier templates
CREATE TABLE IF NOT EXISTS public.production_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_type text NOT NULL CHECK (production_type IN ('movie','event','concert')),
  production_id uuid NOT NULL,
  tier_name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  color text NOT NULL DEFAULT '#9C3FA0',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_price_tiers_prod
  ON public.production_price_tiers(production_type, production_id);

GRANT SELECT ON public.production_price_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.production_price_tiers TO authenticated;
GRANT ALL ON public.production_price_tiers TO service_role;
ALTER TABLE public.production_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read production tiers"
  ON public.production_price_tiers FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage production tiers"
  ON public.production_price_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TRIGGER trg_production_price_tiers_updated
  BEFORE UPDATE ON public.production_price_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Production seat → tier mapping
CREATE TABLE IF NOT EXISTS public.production_seat_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_type text NOT NULL CHECK (production_type IN ('movie','event','concert')),
  production_id uuid NOT NULL,
  venue_seat_id uuid NOT NULL REFERENCES public.venue_seats(id) ON DELETE CASCADE,
  tier_template_id uuid NOT NULL REFERENCES public.production_price_tiers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_type, production_id, venue_seat_id)
);
CREATE INDEX IF NOT EXISTS idx_production_seat_tiers_prod
  ON public.production_seat_tiers(production_type, production_id);

GRANT SELECT ON public.production_seat_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.production_seat_tiers TO authenticated;
GRANT ALL ON public.production_seat_tiers TO service_role;
ALTER TABLE public.production_seat_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read production seat tiers"
  ON public.production_seat_tiers FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage production seat tiers"
  ON public.production_seat_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

-- 4. Per-showing seat → tier overrides
CREATE TABLE IF NOT EXISTS public.showing_seat_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showing_id uuid NOT NULL REFERENCES public.showings(id) ON DELETE CASCADE,
  venue_seat_id uuid NOT NULL REFERENCES public.venue_seats(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.showing_price_tiers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (showing_id, venue_seat_id)
);
CREATE INDEX IF NOT EXISTS idx_showing_seat_tiers_showing
  ON public.showing_seat_tiers(showing_id);

GRANT SELECT ON public.showing_seat_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.showing_seat_tiers TO authenticated;
GRANT ALL ON public.showing_seat_tiers TO service_role;
ALTER TABLE public.showing_seat_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read showing seat tiers"
  ON public.showing_seat_tiers FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage showing seat tiers"
  ON public.showing_seat_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

-- 5. Helper: apply a production template to a brand-new showing.
-- Copies tiers (1:1) and the seat→tier mapping.
CREATE OR REPLACE FUNCTION public.apply_production_template_to_showing(p_showing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_show RECORD;
  v_prod_type text;
  v_prod_id uuid;
  v_template RECORD;
  v_new_tier_id uuid;
  v_mapping jsonb := '{}'::jsonb;
BEGIN
  SELECT movie_id, event_id, live_performance_id INTO v_show
  FROM public.showings WHERE id = p_showing_id;

  IF v_show.movie_id IS NOT NULL THEN
    v_prod_type := 'movie'; v_prod_id := v_show.movie_id;
  ELSIF v_show.event_id IS NOT NULL THEN
    v_prod_type := 'event'; v_prod_id := v_show.event_id;
  ELSIF v_show.live_performance_id IS NOT NULL THEN
    v_prod_type := 'concert'; v_prod_id := v_show.live_performance_id;
  ELSE
    RETURN;
  END IF;

  -- Only seed if showing has no tiers yet
  IF EXISTS (SELECT 1 FROM public.showing_price_tiers WHERE showing_id = p_showing_id) THEN
    RETURN;
  END IF;

  -- Copy tier rows; remember template_id → new tier id
  FOR v_template IN
    SELECT * FROM public.production_price_tiers
    WHERE production_type = v_prod_type AND production_id = v_prod_id
    ORDER BY display_order
  LOOP
    INSERT INTO public.showing_price_tiers (showing_id, tier_name, price, color, display_order, is_active)
    VALUES (p_showing_id, v_template.tier_name, v_template.price, v_template.color, v_template.display_order, true)
    RETURNING id INTO v_new_tier_id;
    v_mapping := v_mapping || jsonb_build_object(v_template.id::text, v_new_tier_id::text);
  END LOOP;

  -- Copy seat→tier mapping using the id map above
  INSERT INTO public.showing_seat_tiers (showing_id, venue_seat_id, tier_id)
  SELECT p_showing_id, pst.venue_seat_id, (v_mapping ->> pst.tier_template_id::text)::uuid
  FROM public.production_seat_tiers pst
  WHERE pst.production_type = v_prod_type AND pst.production_id = v_prod_id
    AND v_mapping ? pst.tier_template_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_production_template_to_showing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_production_template_to_showing(uuid) TO authenticated, service_role;

-- 6. Strengthen ticket pricing trigger: prefer seat-tier price when a mapping exists.
CREATE OR REPLACE FUNCTION public.enforce_ticket_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_price numeric;
  v_seat_tier_id uuid;
  v_tax_rate numeric := 0.06;
BEGIN
  -- If the seat has a tier mapping for this showing, that tier wins.
  IF NEW.seat_id IS NOT NULL THEN
    SELECT sst.tier_id INTO v_seat_tier_id
    FROM public.showing_seat_tiers sst
    JOIN public.seats s ON s.id = NEW.seat_id
    JOIN public.venue_seats vs
      ON vs.seat_row = s.seat_row
     AND vs.seat_number = s.seat_number
     AND COALESCE(vs.section,'') = COALESCE(s.section,'')
    WHERE sst.showing_id = NEW.showing_id
      AND sst.venue_seat_id = vs.id
    LIMIT 1;

    IF v_seat_tier_id IS NOT NULL THEN
      NEW.tier_id := v_seat_tier_id;
    END IF;
  END IF;

  IF NEW.tier_id IS NOT NULL THEN
    SELECT price INTO v_ticket_price
    FROM public.showing_price_tiers
    WHERE id = NEW.tier_id AND showing_id = NEW.showing_id;
    IF v_ticket_price IS NULL THEN
      RAISE EXCEPTION 'Invalid tier_id for this showing';
    END IF;
  ELSE
    SELECT ticket_price INTO v_ticket_price
    FROM public.showings WHERE id = NEW.showing_id;
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
$$;
