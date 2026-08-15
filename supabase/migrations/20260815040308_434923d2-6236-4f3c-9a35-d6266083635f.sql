CREATE TABLE public.letterheads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number text,
  letter_date date,
  recipient_name text,
  recipient_address text,
  subject text,
  salutation text,
  body text,
  closing text,
  signatory_name text,
  designation text,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letterheads TO authenticated;
GRANT ALL ON public.letterheads TO service_role;

ALTER TABLE public.letterheads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Letterhead users can view saved letters"
ON public.letterheads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
);

CREATE POLICY "Letterhead users can create letters"
ON public.letterheads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
);

CREATE POLICY "Letterhead users can update letters"
ON public.letterheads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
);

CREATE POLICY "Letterhead users can delete letters"
ON public.letterheads FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_tab_permission(auth.uid(), 'letterhead')
);

CREATE INDEX idx_letterheads_letter_date ON public.letterheads (letter_date DESC);
CREATE INDEX idx_letterheads_recipient_name ON public.letterheads (lower(recipient_name));

CREATE TRIGGER update_letterheads_updated_at
BEFORE UPDATE ON public.letterheads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();