-- Add family_name and date_of_marriage columns to gb_members table
ALTER TABLE public.gb_members 
ADD COLUMN family_name text,
ADD COLUMN date_of_marriage date;