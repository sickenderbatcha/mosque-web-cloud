-- Add public SELECT policy for admin_pdf_documents so documents can be viewed on the About page
CREATE POLICY "Anyone can view published pdf documents"
ON public.admin_pdf_documents
FOR SELECT
TO public
USING (true);