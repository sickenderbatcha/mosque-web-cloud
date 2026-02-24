-- Create management_committee table for storing trustee and committee member details
CREATE TABLE public.management_committee (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position TEXT NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT,
  qualification TEXT,
  is_current BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.management_committee ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage committee members" 
ON public.management_committee 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view current committee members" 
ON public.management_committee 
FOR SELECT 
USING (is_current = true);

-- Insert default Managing Trustee (from the certificate template)
INSERT INTO public.management_committee (position, name, qualification, is_current, sort_order)
VALUES ('Managing Trustee', 'Haji K.M.Rabique Dawood', 'B.Com., HDC.', true, 1);