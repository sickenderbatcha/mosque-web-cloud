-- Add partner_applicant_relationship column to noc_certificates table
ALTER TABLE public.noc_certificates
ADD COLUMN partner_applicant_relationship text;