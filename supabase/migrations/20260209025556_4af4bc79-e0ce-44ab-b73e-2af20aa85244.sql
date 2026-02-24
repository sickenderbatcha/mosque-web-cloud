-- Fix 1: Update has_role function so superadmin inherits admin permissions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'superadmin')
      )
  )
$$;

-- Fix 2: Update landing_page_content policy to also check for superadmin directly
-- (since it uses a direct EXISTS check, not has_role)
DROP POLICY IF EXISTS "Admins can manage landing page content" ON public.landing_page_content;
CREATE POLICY "Admins can manage landing page content"
ON public.landing_page_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
  )
);