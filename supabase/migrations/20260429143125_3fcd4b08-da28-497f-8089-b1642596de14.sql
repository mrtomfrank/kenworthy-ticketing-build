-- Storage bucket for menu PDFs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('concession-menus', 'concession-menus', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload concession menus"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'concession-menus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update concession menus"
ON storage.objects FOR UPDATE
USING (bucket_id = 'concession-menus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete concession menus"
ON storage.objects FOR DELETE
USING (bucket_id = 'concession-menus' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff and admins can view concession menus"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'concession-menus'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Versioned menus table
CREATE TABLE public.concession_menus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  file_path text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concession_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active menu"
ON public.concession_menus FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can insert menus"
ON public.concession_menus FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update menus"
ON public.concession_menus FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete menus"
ON public.concession_menus FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_concession_menus_updated_at
BEFORE UPDATE ON public.concession_menus
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one active menu
CREATE OR REPLACE FUNCTION public.enforce_single_active_menu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.concession_menus
    SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER concession_menus_single_active
AFTER INSERT OR UPDATE OF is_active ON public.concession_menus
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.enforce_single_active_menu();