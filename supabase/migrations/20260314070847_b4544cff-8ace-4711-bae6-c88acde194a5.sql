
-- Create mahal-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('mahal-photos', 'mahal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view mahal photos
CREATE POLICY "Anyone can view mahal photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'mahal-photos');

-- Allow admins to upload mahal photos
CREATE POLICY "Admins can upload mahal photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mahal-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete mahal photos
CREATE POLICY "Admins can delete mahal photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mahal-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
