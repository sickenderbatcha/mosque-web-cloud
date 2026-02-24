-- Ensure admins AND superadmins can manage heir certificates (with proper WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage all heir certificates" ON public.heir_certificates;

CREATE POLICY "Admins can select heir certificates"
ON public.heir_certificates
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
);

CREATE POLICY "Admins can insert heir certificates"
ON public.heir_certificates
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
);

CREATE POLICY "Admins can update heir certificates"
ON public.heir_certificates
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
);

CREATE POLICY "Admins can delete heir certificates"
ON public.heir_certificates
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
);

-- Keep existing end-user policies intact (Users can view/update their own; Anyone can create)