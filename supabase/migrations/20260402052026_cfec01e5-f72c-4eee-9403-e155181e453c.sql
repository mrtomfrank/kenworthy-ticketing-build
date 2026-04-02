
-- Create storage bucket for posters
INSERT INTO storage.buckets (id, name, public) VALUES ('posters', 'posters', true);

-- Anyone can view poster images
CREATE POLICY "Poster images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'posters');

-- Admins can upload posters
CREATE POLICY "Admins can upload posters"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update posters
CREATE POLICY "Admins can update posters"
ON storage.objects FOR UPDATE
USING (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete posters
CREATE POLICY "Admins can delete posters"
ON storage.objects FOR DELETE
USING (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));
