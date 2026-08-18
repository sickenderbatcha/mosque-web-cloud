DROP POLICY IF EXISTS "Member photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Marriage photos are publicly accessible" ON storage.objects;

CREATE POLICY "Signed-in users can view member photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'member-photos');

CREATE POLICY "Signed-in users can view marriage photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marriage-photos');

DROP POLICY IF EXISTS "Authenticated users can upload marriage photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload marriage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marriage-photos');