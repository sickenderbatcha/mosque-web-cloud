
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  target_table text,
  target_id text,
  target_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.admin_audit_logs (action_type);
CREATE INDEX idx_audit_logs_performed_by ON public.admin_audit_logs (performed_by);
