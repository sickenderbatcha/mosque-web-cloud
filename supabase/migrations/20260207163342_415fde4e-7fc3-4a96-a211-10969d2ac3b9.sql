
-- Drop the existing ALL policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Admins can manage marriage registers" ON public.marriage_registers;

-- Create granular policies with both admin and superadmin support
CREATE POLICY "Admins can select marriage registers"
ON public.marriage_registers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can insert marriage registers"
ON public.marriage_registers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update marriage registers"
ON public.marriage_registers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete marriage registers"
ON public.marriage_registers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
