-- Create storage bucket for certificate assets (signature and seal images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-assets', 'certificate-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to certificate assets
CREATE POLICY "Public can read certificate assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'certificate-assets');

-- Allow authenticated admins to upload/update/delete certificate assets
CREATE POLICY "Admins can upload certificate assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificate-assets' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update certificate assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'certificate-assets' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete certificate assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'certificate-assets' 
  AND public.has_role(auth.uid(), 'admin')
);