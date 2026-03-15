
CREATE TABLE public.ex_managing_trustees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_tamil TEXT,
  description TEXT,
  description_tamil TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ex_managing_trustees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ex trustees"
  ON public.ex_managing_trustees
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage ex trustees"
  ON public.ex_managing_trustees
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
