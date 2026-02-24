-- Drop the existing admin policy that doesn't work for INSERT
DROP POLICY IF EXISTS "Admins can manage income" ON public.income;

-- Create separate policies for admins with proper WITH CHECK for INSERT
CREATE POLICY "Admins can select income"
ON public.income FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can insert income"
ON public.income FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update income"
ON public.income FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete income"
ON public.income FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));