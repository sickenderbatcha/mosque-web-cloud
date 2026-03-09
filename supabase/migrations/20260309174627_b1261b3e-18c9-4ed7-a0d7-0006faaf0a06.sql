-- Make admin-documents bucket public so documents can be downloaded from About page
UPDATE storage.buckets SET public = true WHERE id = 'admin-documents';