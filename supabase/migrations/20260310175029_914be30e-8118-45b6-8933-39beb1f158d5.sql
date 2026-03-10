
-- Fix NOC/Heir certificates that have payment_status='completed' but no certificate_payments record
-- This creates the missing certificate_payment records and triggers income generation

-- For NOC certificates without certificate_payments
INSERT INTO public.certificate_payments (reference_id, certificate_type, applicant_name, applicant_phone, applicant_email, user_id, amount, payment_status, payment_method, transaction_id)
SELECT 
  nc.id,
  'noc',
  nc.applicant_name,
  COALESCE(nc.applicant_phone, ''),
  nc.applicant_email,
  nc.user_id,
  COALESCE(cpr.amount, 100),
  'completed',
  'cash',
  'CASH-' || UPPER(SUBSTRING(REPLACE(nc.id::text, '-', '') FROM 1 FOR 8))
FROM public.noc_certificates nc
LEFT JOIN public.certificate_payments cp ON cp.reference_id = nc.id AND cp.certificate_type = 'noc'
LEFT JOIN public.cash_payment_requests cpr ON cpr.reference_id = nc.id AND cpr.service_type = 'noc'
WHERE nc.payment_status IN ('completed', 'paid')
  AND cp.id IS NULL;

-- For Heir certificates without certificate_payments
INSERT INTO public.certificate_payments (reference_id, certificate_type, applicant_name, applicant_phone, applicant_email, user_id, amount, payment_status, payment_method, transaction_id)
SELECT 
  hc.id,
  'heir',
  hc.applicant_name,
  COALESCE(hc.applicant_phone, ''),
  hc.applicant_email,
  hc.user_id,
  COALESCE(cpr.amount, 100),
  'completed',
  'cash',
  'CASH-' || UPPER(SUBSTRING(REPLACE(hc.id::text, '-', '') FROM 1 FOR 8))
FROM public.heir_certificates hc
LEFT JOIN public.certificate_payments cp ON cp.reference_id = hc.id AND cp.certificate_type = 'heir'
LEFT JOIN public.cash_payment_requests cpr ON cpr.reference_id = hc.id AND cpr.service_type = 'heir'
WHERE hc.payment_status IN ('completed', 'paid')
  AND cp.id IS NULL;

-- Fix NOC certificates that have payment_status='completed' but status is still 'payment_pending'
UPDATE public.noc_certificates
SET status = 'submitted'
WHERE payment_status IN ('completed', 'paid')
  AND status = 'payment_pending';
