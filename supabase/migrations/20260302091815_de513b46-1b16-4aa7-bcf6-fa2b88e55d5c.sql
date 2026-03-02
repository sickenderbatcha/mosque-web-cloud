
-- Fix marriage photos storage: restrict update/delete to admin or owner
DROP POLICY IF EXISTS "Authenticated users can update marriage photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete marriage photos" ON storage.objects;

CREATE POLICY "Admins can update marriage photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marriage-photos' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Admins can delete marriage photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marriage-photos' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
