UPDATE public.certificate_payments cp
SET user_id = r.user_id
FROM public.cash_payment_requests r
WHERE cp.reference_id = r.reference_id
  AND cp.user_id IS NULL
  AND r.user_id IS NOT NULL
  AND cp.payment_method = 'cash';