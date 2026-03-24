
ALTER TABLE public.tickets ADD COLUMN scanned_at timestamp with time zone DEFAULT NULL;

CREATE POLICY "Admins can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
