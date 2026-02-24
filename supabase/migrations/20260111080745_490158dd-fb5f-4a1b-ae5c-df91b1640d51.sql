-- Create death_registers table for storing death certificate records
CREATE TABLE public.death_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Date information (Islamic & Gregorian)
  hijri_year INTEGER NOT NULL,
  hijri_month TEXT NOT NULL,
  hijri_day INTEGER NOT NULL,
  gregorian_year INTEGER NOT NULL,
  gregorian_month TEXT NOT NULL,
  gregorian_day INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  
  -- Deceased person details
  deceased_name TEXT NOT NULL,
  deceased_name_en TEXT,
  deceased_father_name TEXT NOT NULL,
  deceased_father_name_en TEXT,
  deceased_age INTEGER NOT NULL,
  deceased_gender TEXT NOT NULL DEFAULT 'Male',
  deceased_address TEXT NOT NULL,
  deceased_occupation TEXT,
  
  -- Death details
  death_date DATE NOT NULL,
  death_time TIME,
  place_of_death TEXT NOT NULL,
  cause_of_death TEXT,
  
  -- Burial details
  burial_date DATE,
  burial_time TIME,
  burial_place TEXT,
  burial_place_en TEXT,
  
  -- Family member who reported
  informant_name TEXT NOT NULL,
  informant_name_en TEXT,
  informant_relationship TEXT NOT NULL,
  informant_phone TEXT,
  informant_address TEXT,
  
  -- Witness details
  witness1_name TEXT,
  witness1_name_en TEXT,
  witness1_father_name TEXT,
  witness2_name TEXT,
  witness2_name_en TEXT,
  witness2_father_name TEXT,
  
  -- Registration details
  register_page_number TEXT,
  member_id TEXT,
  registrar_name TEXT NOT NULL,
  registrar_father_name TEXT,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.death_registers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read death registers (public records)
CREATE POLICY "Death registers are viewable by everyone"
ON public.death_registers
FOR SELECT
USING (true);

-- Only admins can insert death registers
CREATE POLICY "Admins can insert death registers"
ON public.death_registers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update death registers
CREATE POLICY "Admins can update death registers"
ON public.death_registers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete death registers
CREATE POLICY "Admins can delete death registers"
ON public.death_registers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_death_registers_updated_at
BEFORE UPDATE ON public.death_registers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();