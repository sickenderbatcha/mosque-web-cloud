
-- Create storage bucket for admin PDF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-documents', 'admin-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for admin-documents bucket
-- Only admins/superadmins can upload
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins/superadmins can view/download
CREATE POLICY "Admins can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'admin-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins/superadmins can delete
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'admin-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Create table to store PDF document metadata
CREATE TABLE public.admin_pdf_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_pdf_documents ENABLE ROW LEVEL SECURITY;

-- Only admins/superadmins can read
CREATE POLICY "Admins can view pdf documents"
ON public.admin_pdf_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins/superadmins can insert
CREATE POLICY "Admins can insert pdf documents"
ON public.admin_pdf_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins/superadmins can update
CREATE POLICY "Admins can update pdf documents"
ON public.admin_pdf_documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Only admins/superadmins can delete
CREATE POLICY "Admins can delete pdf documents"
ON public.admin_pdf_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_admin_pdf_documents_updated_at
BEFORE UPDATE ON public.admin_pdf_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
