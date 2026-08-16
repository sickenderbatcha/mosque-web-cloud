CREATE TABLE public.letterhead_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letterhead_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created','updated','deleted')),
  changed_fields text[] NOT NULL DEFAULT '{}',
  performed_by uuid,
  performed_by_name text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.letterhead_audit_logs TO authenticated;
GRANT ALL ON public.letterhead_audit_logs TO service_role;

ALTER TABLE public.letterhead_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Letterhead users can view letter history"
ON public.letterhead_audit_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
);

CREATE POLICY "Letterhead users can add letter history"
ON public.letterhead_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  performed_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_tab_permission(auth.uid(), 'letterhead')
  )
);

CREATE INDEX idx_letterhead_audit_logs_letter ON public.letterhead_audit_logs (letterhead_id, created_at DESC);