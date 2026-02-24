-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true);

-- Allow public read access to member photos
CREATE POLICY "Member photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'member-photos');

-- Allow authenticated users (admins) to upload member photos
CREATE POLICY "Admins can upload member photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'member-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users (admins) to update member photos
CREATE POLICY "Admins can update member photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'member-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users (admins) to delete member photos
CREATE POLICY "Admins can delete member photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'member-photos' AND auth.role() = 'authenticated');