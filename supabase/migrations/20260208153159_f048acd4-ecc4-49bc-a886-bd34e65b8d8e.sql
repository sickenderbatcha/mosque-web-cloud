-- Fix admin_pdf_documents RLS policies to use has_role() security definer function
DROP POLICY IF EXISTS "Admins can view pdf documents" ON public.admin_pdf_documents;
DROP POLICY IF EXISTS "Admins can insert pdf documents" ON public.admin_pdf_documents;
DROP POLICY IF EXISTS "Admins can update pdf documents" ON public.admin_pdf_documents;
DROP POLICY IF EXISTS "Admins can delete pdf documents" ON public.admin_pdf_documents;

CREATE POLICY "Admins can view pdf documents"
ON public.admin_pdf_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can insert pdf documents"
ON public.admin_pdf_documents FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can update pdf documents"
ON public.admin_pdf_documents FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can delete pdf documents"
ON public.admin_pdf_documents FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));