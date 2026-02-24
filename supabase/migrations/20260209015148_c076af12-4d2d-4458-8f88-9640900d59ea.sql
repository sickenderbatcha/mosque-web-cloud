
-- Create storage bucket for automated database backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('database-backups', 'database-backups', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Only admins can read backups
CREATE POLICY "Admins can read database backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'database-backups'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only service role (edge functions) can insert backups - no user policy needed for insert
-- The edge function uses service_role key which bypasses RLS

-- Admins can delete old backups
CREATE POLICY "Admins can delete database backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'database-backups'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);
