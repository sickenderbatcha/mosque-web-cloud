-- Update trigger function to use dynamic fee from app_settings
CREATE OR REPLACE FUNCTION public.add_noc_payment_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  noc_fee numeric;
BEGIN
  -- Only add to income when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Check if income already exists for this NOC payment
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'noc_certificate') THEN
      -- Get NOC fee from app_settings, default to 100 if not found
      SELECT COALESCE(value::numeric, 100) INTO noc_fee
      FROM public.app_settings
      WHERE key = 'certificate_fee_noc';
      
      IF noc_fee IS NULL THEN
        noc_fee := 100;
      END IF;

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
        noc_fee,
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