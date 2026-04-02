
-- Concession menu items
CREATE TABLE public.concession_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concession_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active concession items"
  ON public.concession_items FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can insert concession items"
  ON public.concession_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update concession items"
  ON public.concession_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete concession items"
  ON public.concession_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_concession_items_updated_at
  BEFORE UPDATE ON public.concession_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Concession sale transactions
CREATE TABLE public.concession_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showing_id UUID REFERENCES public.showings(id) ON DELETE SET NULL,
  staff_user_id UUID NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0.06,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concession_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view concession sales"
  ON public.concession_sales FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can insert concession sales"
  ON public.concession_sales FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can update concession sales"
  ON public.concession_sales FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete concession sales"
  ON public.concession_sales FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Line items within each sale
CREATE TABLE public.concession_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.concession_sales(id) ON DELETE CASCADE,
  concession_item_id UUID NOT NULL REFERENCES public.concession_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL
);

ALTER TABLE public.concession_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view concession sale items"
  ON public.concession_sale_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can insert concession sale items"
  ON public.concession_sale_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can delete concession sale items"
  ON public.concession_sale_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
