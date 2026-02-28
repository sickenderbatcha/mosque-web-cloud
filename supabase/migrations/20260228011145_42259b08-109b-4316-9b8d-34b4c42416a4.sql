
CREATE OR REPLACE FUNCTION public.get_non_admin_gb_members()
RETURNS SETOF gb_members
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gm.*
  FROM gb_members gm
  WHERE gm.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = gm.auth_user_id
        AND ur.role IN ('admin', 'superadmin')
    )
  ORDER BY gm.member_id;
$$;
