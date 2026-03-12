
-- Add photo_url column to management_committee table
ALTER TABLE public.management_committee ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for committee photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('committee-photos', 'committee-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload committee photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'committee-photos' AND (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))));

-- Allow anyone to view
CREATE POLICY "Anyone can view committee photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'committee-photos');

-- Allow admins to delete
CREATE POLICY "Admins can delete committee photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'committee-photos' AND (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))));
