-- Make date_of_birth, family_name, phone, address optional in gb_members
ALTER TABLE public.gb_members ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE public.gb_members ALTER COLUMN family_name DROP NOT NULL;
ALTER TABLE public.gb_members ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.gb_members ALTER COLUMN address DROP NOT NULL;