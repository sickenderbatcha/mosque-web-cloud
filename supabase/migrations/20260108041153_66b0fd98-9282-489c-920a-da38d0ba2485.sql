-- Add member_id column to marriage_registers table
ALTER TABLE public.marriage_registers 
ADD COLUMN member_id TEXT;