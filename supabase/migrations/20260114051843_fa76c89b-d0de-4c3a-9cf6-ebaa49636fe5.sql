-- Add applicant contact fields to noc_certificates table
ALTER TABLE public.noc_certificates
ADD COLUMN applicant_email text,
ADD COLUMN applicant_phone text;