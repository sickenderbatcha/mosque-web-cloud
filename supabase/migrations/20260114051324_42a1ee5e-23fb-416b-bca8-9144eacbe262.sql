-- Create trigger function to add NOC certificate payment to income
CREATE OR REPLACE FUNCTION public.add_noc_payment_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only add to income when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Check if income already exists for this NOC payment
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'noc_certificate') THEN
      INSERT INTO public.income (
        amount,
        category,
        source,
        description,
        income_date,
        payment_method,
        reference_id,
        reference_type
      ) VALUES (
        100, -- NOC certificate fee
        'ஆட்சேபனையின்மை சான்றிதழ் (NOC)',
        NEW.applicant_name,
        'NOC சான்றிதழ் - ' || NEW.applicant_name || ' (' || NEW.father_name || ' மகன்/மகள்)',
        CURRENT_DATE,
        'Online',
        NEW.id,
        'noc_certificate'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for NOC certificate payment income tracking
CREATE TRIGGER add_noc_payment_to_income_trigger
AFTER UPDATE ON public.noc_certificates
FOR EACH ROW
EXECUTE FUNCTION public.add_noc_payment_to_income();