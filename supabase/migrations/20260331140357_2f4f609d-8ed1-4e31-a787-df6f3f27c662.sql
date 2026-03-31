
CREATE TABLE public.user_tab_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, tab_key)
);

ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage tab permissions"
ON public.user_tab_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own tab permissions"
ON public.user_tab_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
