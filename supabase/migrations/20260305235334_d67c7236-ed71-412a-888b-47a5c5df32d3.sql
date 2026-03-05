
-- Fix noc_certificates: Drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all NOC requests" ON public.noc_certificates;
DROP POLICY IF EXISTS "Anyone can create NOC requests" ON public.noc_certificates;
DROP POLICY IF EXISTS "Users can update their own pending NOC requests" ON public.noc_certificates;
DROP POLICY IF EXISTS "Users can view their own NOC requests" ON public.noc_certificates;

CREATE POLICY "Admins can manage all NOC requests"
  ON public.noc_certificates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create NOC requests"
  ON public.noc_certificates FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own pending NOC requests"
  ON public.noc_certificates FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id AND status = ANY (ARRAY['pending', 'payment_pending']))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view their own NOC requests"
  ON public.noc_certificates FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix heir_certificates: Drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can delete heir certificates" ON public.heir_certificates;
DROP POLICY IF EXISTS "Admins can insert heir certificates" ON public.heir_certificates;
DROP POLICY IF EXISTS "Admins can select heir certificates" ON public.heir_certificates;
DROP POLICY IF EXISTS "Admins can update heir certificates" ON public.heir_certificates;
DROP POLICY IF EXISTS "Anyone can create heir certificate requests" ON public.heir_certificates;
DROP POLICY IF EXISTS "Users can update their own pending heir certificate requests" ON public.heir_certificates;
DROP POLICY IF EXISTS "Users can view their own heir certificate requests" ON public.heir_certificates;

CREATE POLICY "Admins can manage heir certificates"
  ON public.heir_certificates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create heir certificate requests"
  ON public.heir_certificates FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own pending heir certificate requests"
  ON public.heir_certificates FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id AND status = ANY (ARRAY['pending', 'payment_pending']))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view their own heir certificate requests"
  ON public.heir_certificates FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
