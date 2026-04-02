
-- Fix movies SELECT policy to filter inactive
DROP POLICY IF EXISTS "Anyone can view active movies" ON public.movies;
CREATE POLICY "Anyone can view active movies"
ON public.movies FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Fix showings SELECT policy to filter inactive
DROP POLICY IF EXISTS "Anyone can view active showings" ON public.showings;
CREATE POLICY "Anyone can view active showings"
ON public.showings FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Add INSERT policy for profiles so users can create their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());
