
CREATE TABLE public.belong_to_us_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_tamil TEXT,
  description TEXT,
  description_tamil TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.belong_to_us_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active belong_to_us items"
  ON public.belong_to_us_items
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage belong_to_us items"
  ON public.belong_to_us_items
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
