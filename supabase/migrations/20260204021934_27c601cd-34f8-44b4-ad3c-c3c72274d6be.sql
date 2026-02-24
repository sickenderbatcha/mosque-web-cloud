-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

-- Create updated policy that allows both admin and superadmin roles
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);