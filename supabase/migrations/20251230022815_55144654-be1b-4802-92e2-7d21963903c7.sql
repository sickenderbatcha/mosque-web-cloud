-- First update existing NULL values with placeholder data
UPDATE public.gb_members SET father_name = 'Not Specified' WHERE father_name IS NULL;
UPDATE public.gb_members SET family_name = 'Not Specified' WHERE family_name IS NULL;
UPDATE public.gb_members SET date_of_birth = '1900-01-01' WHERE date_of_birth IS NULL;
UPDATE public.gb_members SET date_of_marriage = '1900-01-01' WHERE date_of_marriage IS NULL;
UPDATE public.gb_members SET address = 'Not Specified' WHERE address IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE public.gb_members 
  ALTER COLUMN father_name SET NOT NULL,
  ALTER COLUMN family_name SET NOT NULL,
  ALTER COLUMN date_of_birth SET NOT NULL,
  ALTER COLUMN date_of_marriage SET NOT NULL,
  ALTER COLUMN address SET NOT NULL;