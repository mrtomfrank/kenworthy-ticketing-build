
-- Fix tickets INSERT policy to only apply to authenticated users
DROP POLICY IF EXISTS "Users can purchase tickets" ON public.tickets;
CREATE POLICY "Users can purchase tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
