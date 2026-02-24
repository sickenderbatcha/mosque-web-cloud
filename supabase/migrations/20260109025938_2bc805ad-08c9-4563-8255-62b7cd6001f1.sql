-- Add kathib_thaib fields to marriage_registers table
ALTER TABLE public.marriage_registers
ADD COLUMN kathib_thaib_name TEXT,
ADD COLUMN kathib_thaib_father_name TEXT;