CREATE POLICY "Admins can delete cash payment requests"
ON public.cash_payment_requests
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'cash-requests'::text)
);

GRANT DELETE ON public.cash_payment_requests TO authenticated;