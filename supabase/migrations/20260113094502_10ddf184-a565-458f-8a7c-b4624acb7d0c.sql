-- Add husband_name fields to death_registers table for married women
ALTER TABLE public.death_registers
ADD COLUMN deceased_husband_name text,
ADD COLUMN deceased_husband_name_en text;