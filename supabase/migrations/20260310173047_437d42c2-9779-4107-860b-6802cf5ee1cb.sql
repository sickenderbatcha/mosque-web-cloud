-- Fix existing cash certificate_payments with null user_id by copying from noc_certificates
UPDATE public.certificate_payments cp
SET user_id = nc.user_id
FROM public.noc_certificates nc
WHERE cp.reference_id = nc.id
  AND cp.certificate_type = 'noc'
  AND cp.user_id IS NULL
  AND nc.user_id IS NOT NULL;

-- Fix existing cash certificate_payments with null user_id by copying from heir_certificates
UPDATE public.certificate_payments cp
SET user_id = hc.user_id
FROM public.heir_certificates hc
WHERE cp.reference_id = hc.id
  AND cp.certificate_type = 'heir'
  AND cp.user_id IS NULL
  AND hc.user_id IS NOT NULL;