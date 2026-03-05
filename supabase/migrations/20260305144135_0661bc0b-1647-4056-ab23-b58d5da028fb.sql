-- Drop duplicate NOC income trigger (certificate_payments trigger already handles this)
DROP TRIGGER IF EXISTS add_noc_payment_to_income_trigger ON public.noc_certificates;
DROP FUNCTION IF EXISTS public.add_noc_payment_to_income();

-- Drop duplicate Heir income trigger (certificate_payments trigger already handles this)  
DROP TRIGGER IF EXISTS trigger_add_heir_payment_to_income ON public.heir_certificates;
DROP FUNCTION IF EXISTS public.add_heir_payment_to_income();