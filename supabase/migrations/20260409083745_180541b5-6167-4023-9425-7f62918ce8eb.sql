
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'prayer-times'::text)
  OR has_tab_permission(auth.uid(), 'settings'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'prayer-times'::text)
  OR has_tab_permission(auth.uid(), 'settings'::text)
);
