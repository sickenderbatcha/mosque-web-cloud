-- Add English fields to marriage_registers table for certificate printing
ALTER TABLE public.marriage_registers
ADD COLUMN IF NOT EXISTS groom_name_en TEXT,
ADD COLUMN IF NOT EXISTS groom_father_name_en TEXT,
ADD COLUMN IF NOT EXISTS bride_name_en TEXT,
ADD COLUMN IF NOT EXISTS bride_father_name_en TEXT,
ADD COLUMN IF NOT EXISTS wali_name_en TEXT,
ADD COLUMN IF NOT EXISTS witness1_name_en TEXT,
ADD COLUMN IF NOT EXISTS witness1_father_name_en TEXT,
ADD COLUMN IF NOT EXISTS witness2_name_en TEXT,
ADD COLUMN IF NOT EXISTS witness2_father_name_en TEXT,
ADD COLUMN IF NOT EXISTS kathib_name_en TEXT,
ADD COLUMN IF NOT EXISTS mahr_en TEXT,
ADD COLUMN IF NOT EXISTS place_of_marriage_en TEXT,
ADD COLUMN IF NOT EXISTS day_name_en TEXT;