
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Admins can view app settings for management"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'prayer-times'::text)
  OR has_tab_permission(auth.uid(), 'settings'::text)
);

CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'prayer-times'::text)
  OR has_tab_permission(auth.uid(), 'settings'::text)
);

CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
TO authenticated
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

CREATE POLICY "Admins can delete app settings"
ON public.app_settings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_tab_permission(auth.uid(), 'prayer-times'::text)
  OR has_tab_permission(auth.uid(), 'settings'::text)
);
