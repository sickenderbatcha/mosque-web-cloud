-- Create function to add heir certificate payment to income
CREATE OR REPLACE FUNCTION public.add_heir_payment_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  heir_fee numeric;
BEGIN
  -- Only add to income when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Check if income already exists for this heir certificate payment
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'heir_certificate') THEN
      -- Get heir fee from app_settings, default to 100 if not found
      SELECT COALESCE(value::numeric, 100) INTO heir_fee
      FROM public.app_settings
      WHERE key = 'certificate_fee_heir';
      
      IF heir_fee IS NULL THEN
        heir_fee := 100;
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
        heir_fee,
        'வாரிசு சான்றிதழ் (Heir Certificate)',
        NEW.applicant_name,
        'வாரிசு சான்றிதழ் - ' || NEW.deceased_name || ' (' || NEW.deceased_father_name || ' மகன்/மகள்)',
        CURRENT_DATE,
        'Online',
        NEW.id,
        'heir_certificate'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for heir certificate payments
DROP TRIGGER IF EXISTS trigger_add_heir_payment_to_income ON public.heir_certificates;
CREATE TRIGGER trigger_add_heir_payment_to_income
  AFTER UPDATE ON public.heir_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.add_heir_payment_to_income();

-- Also notify admin when new heir certificate request is created
CREATE OR REPLACE FUNCTION public.notify_admin_new_heir_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id, reference_type)
  VALUES (
    'new_heir_request',
    'புதிய வாரிசு சான்றிதழ் கோரிக்கை (New Heir Certificate Request)',
    'புதிய வாரிசு சான்றிதழ் கோரிக்கை ' || NEW.applicant_name || ' அவர்களிடமிருந்து ' || NEW.deceased_name || ' க்கு பெறப்பட்டுள்ளது.',
    NEW.id,
    'heir_certificates'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new heir certificate notifications
DROP TRIGGER IF EXISTS trigger_notify_admin_new_heir_request ON public.heir_certificates;
CREATE TRIGGER trigger_notify_admin_new_heir_request
  AFTER INSERT ON public.heir_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_heir_request();