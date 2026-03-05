
-- Fix: Only create income for completed donations on INSERT
CREATE OR REPLACE FUNCTION public.add_donation_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  -- Only create income if payment is actually completed
  IF NEW.payment_status = 'completed' OR NEW.payment_status = 'paid' THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'donation') THEN
      receipt_num := public.get_next_receipt_number('donation');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        NEW.amount,
        'நன்கொடை (Donation)',
        COALESCE(NEW.donor_name, 'Anonymous'),
        COALESCE(NEW.purpose, 'General Donation'),
        COALESCE(NEW.donated_at::date, CURRENT_DATE),
        COALESCE(NEW.payment_method, 'Online'),
        receipt_num,
        NEW.id,
        'donation'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop old INSERT-only trigger
DROP TRIGGER IF EXISTS trigger_donation_to_income ON public.donations;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_donation_to_income
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION add_donation_to_income();

-- Clean up incorrect income records for the two failed donations
DELETE FROM public.income 
WHERE reference_type = 'donation' 
AND reference_id IN ('3f47077d-792b-446c-8585-205ec3f66c73', '2a09f032-fdf0-4835-ab38-7970b760c673');
