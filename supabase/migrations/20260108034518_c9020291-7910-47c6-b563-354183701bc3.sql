
-- Create marriage_registers table
CREATE TABLE public.marriage_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Hijri date fields
  hijri_year INTEGER NOT NULL,
  hijri_month TEXT NOT NULL,
  hijri_day INTEGER NOT NULL,
  
  -- Gregorian date fields
  gregorian_year INTEGER NOT NULL,
  gregorian_month TEXT NOT NULL,
  gregorian_day INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  
  -- Time fields
  day_night TEXT NOT NULL,
  time_of_event TIME NOT NULL,
  
  -- Groom details
  groom_name TEXT NOT NULL,
  groom_father_name TEXT NOT NULL,
  groom_category TEXT,
  groom_address TEXT NOT NULL,
  groom_age INTEGER NOT NULL,
  groom_madhab TEXT,
  
  -- Bride details
  bride_name TEXT NOT NULL,
  bride_father_name TEXT NOT NULL,
  bride_category TEXT,
  bride_address TEXT NOT NULL,
  bride_age INTEGER NOT NULL,
  bride_madhab TEXT,
  
  -- Wali/Wakeel details
  wali_name TEXT NOT NULL,
  wali_father_name TEXT NOT NULL,
  
  -- Mahr
  mahr TEXT NOT NULL,
  
  -- Witnesses
  witness1_name TEXT NOT NULL,
  witness1_father_name TEXT NOT NULL,
  witness2_name TEXT NOT NULL,
  witness2_father_name TEXT NOT NULL,
  
  -- Registrar details
  registrar_name TEXT NOT NULL,
  registrar_father_name TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.marriage_registers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage marriage registers"
ON public.marriage_registers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view marriage registers"
ON public.marriage_registers
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_marriage_registers_updated_at
BEFORE UPDATE ON public.marriage_registers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
