
-- Add photo columns to marriage_registers
ALTER TABLE public.marriage_registers
ADD COLUMN groom_photo_url TEXT,
ADD COLUMN bride_photo_url TEXT;

-- Add photo columns to outside_marriage_registers too for consistency
ALTER TABLE public.outside_marriage_registers
ADD COLUMN groom_photo_url TEXT,
ADD COLUMN bride_photo_url TEXT;

-- Create storage bucket for marriage photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('marriage-photos', 'marriage-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload marriage photos
CREATE POLICY "Authenticated users can upload marriage photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marriage-photos' AND auth.role() = 'authenticated');

-- Allow public read access to marriage photos
CREATE POLICY "Marriage photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'marriage-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update marriage photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'marriage-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete marriage photos
CREATE POLICY "Authenticated users can delete marriage photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'marriage-photos' AND auth.role() = 'authenticated');
