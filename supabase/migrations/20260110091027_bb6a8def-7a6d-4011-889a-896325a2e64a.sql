-- Create function to add certificate payment to income when payment is completed
CREATE OR REPLACE FUNCTION public.add_certificate_payment_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only add to income when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Check if income already exists for this certificate payment
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'certificate_payment') THEN
      INSERT INTO public.income (
        amount,
        category,
        source,
        description,
        income_date,
        payment_method,
        receipt_number,
        reference_id,
        reference_type
      ) VALUES (
        NEW.amount,
        'சான்றிதழ் கட்டணம் (Certificate Fee)',
        NEW.applicant_name,
        CASE NEW.certificate_type
          WHEN 'marriage' THEN 'திருமண சான்றிதழ் (Marriage Certificate)'
          WHEN 'death' THEN 'மரண சான்றிதழ் (Death Certificate)'
          WHEN 'bonafide' THEN 'போனாஃபைட் சான்றிதழ் (Bonafide Certificate)'
          WHEN 'noc' THEN 'ஆட்சேபனையின்மை சான்றிதழ் (NOC)'
          ELSE NEW.certificate_type || ' Certificate'
        END,
        CURRENT_DATE,
        COALESCE(NEW.payment_method, 'Online'),
        NEW.transaction_id,
        NEW.id,
        'certificate_payment'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for UPDATE (when payment status changes)
DROP TRIGGER IF EXISTS add_certificate_payment_to_income_on_update ON public.certificate_payments;
CREATE TRIGGER add_certificate_payment_to_income_on_update
  AFTER UPDATE ON public.certificate_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_certificate_payment_to_income();

-- Create trigger for INSERT (when payment is created with completed status, e.g., cash payment)
DROP TRIGGER IF EXISTS add_certificate_payment_to_income_on_insert ON public.certificate_payments;
CREATE TRIGGER add_certificate_payment_to_income_on_insert
  AFTER INSERT ON public.certificate_payments
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.add_certificate_payment_to_income();