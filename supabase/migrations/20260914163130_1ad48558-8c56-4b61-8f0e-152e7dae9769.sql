DROP POLICY IF EXISTS "Admins can manage refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Users can view their own refund requests" ON public.refund_requests;

CREATE POLICY "Admins can manage refund requests"
ON public.refund_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own refund requests"
ON public.refund_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);