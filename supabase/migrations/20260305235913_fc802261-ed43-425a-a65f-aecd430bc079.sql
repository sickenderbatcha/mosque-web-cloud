DROP POLICY IF EXISTS "Users can update their own pending NOC requests" ON public.noc_certificates;
CREATE POLICY "Users can update their own pending NOC requests"
ON public.noc_certificates
FOR UPDATE
TO authenticated
USING (
  ((auth.uid() = user_id) AND (status = ANY (ARRAY['pending'::text, 'payment_pending'::text])))
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can update their own pending heir certificate requests" ON public.heir_certificates;
CREATE POLICY "Users can update their own pending heir certificate requests"
ON public.heir_certificates
FOR UPDATE
TO authenticated
USING (
  ((auth.uid() = user_id) AND (status = ANY (ARRAY['pending'::text, 'payment_pending'::text])))
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);