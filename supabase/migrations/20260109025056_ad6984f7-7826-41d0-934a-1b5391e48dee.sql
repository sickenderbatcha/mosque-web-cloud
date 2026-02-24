-- Add place of marriage (address) column to marriage_registers table
ALTER TABLE public.marriage_registers 
ADD COLUMN place_of_marriage TEXT;