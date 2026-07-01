
REVOKE SELECT (distributor, circuit, terms_percent) ON public.movies FROM anon;

REVOKE SELECT (contact_name, contact_email, contact_phone, contact_title) ON public.sponsorship_opportunities FROM anon;

DROP POLICY IF EXISTS "Hosts can issue tickets for assigned showings" ON public.tickets;
CREATE POLICY "Hosts can issue tickets for assigned showings"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_host_of_showing(auth.uid(), showing_id)
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'staff'::app_role)
    )
  );
