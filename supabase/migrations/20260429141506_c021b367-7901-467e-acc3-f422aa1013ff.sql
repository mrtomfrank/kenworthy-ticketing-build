-- Combo bundles for concession items
ALTER TABLE public.concession_items
  ADD COLUMN IF NOT EXISTS is_combo boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.concession_combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.concession_items(id) ON DELETE CASCADE,
  child_item_id uuid NOT NULL REFERENCES public.concession_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (combo_id <> child_item_id),
  UNIQUE (combo_id, child_item_id)
);

CREATE INDEX IF NOT EXISTS idx_concession_combo_items_combo ON public.concession_combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_concession_combo_items_child ON public.concession_combo_items(child_item_id);

ALTER TABLE public.concession_combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view combo items"
  ON public.concession_combo_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert combo items"
  ON public.concession_combo_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update combo items"
  ON public.concession_combo_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete combo items"
  ON public.concession_combo_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Mark existing rows in 'Combos' category as combos so they appear as bundle parents
UPDATE public.concession_items
SET is_combo = true
WHERE category = 'Combos';

-- Prevent a combo from being added as a child of another combo
CREATE OR REPLACE FUNCTION public.prevent_nested_combos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.concession_items WHERE id = NEW.child_item_id AND is_combo = true) THEN
    RAISE EXCEPTION 'A combo cannot contain another combo as a child item';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.concession_items WHERE id = NEW.combo_id AND is_combo = true) THEN
    RAISE EXCEPTION 'Parent item must be marked as a combo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_nested_combos ON public.concession_combo_items;
CREATE TRIGGER trg_prevent_nested_combos
  BEFORE INSERT OR UPDATE ON public.concession_combo_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_nested_combos();