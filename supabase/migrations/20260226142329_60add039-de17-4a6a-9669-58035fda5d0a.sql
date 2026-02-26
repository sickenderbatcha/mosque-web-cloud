
CREATE OR REPLACE FUNCTION public.add_booking_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix TEXT;
BEGIN
  IF NEW.status = 'approved' AND (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') AND 
     (OLD.status != 'approved' OR (OLD.payment_status != 'paid' AND OLD.payment_status != 'completed') OR OLD.status IS NULL OR OLD.payment_status IS NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'booking') THEN
      -- Get booking prefix from app_settings
      SELECT COALESCE(value, 'BK-') INTO prefix FROM public.app_settings WHERE key = 'receipt_num_prefix_booking';
      IF prefix IS NULL THEN prefix := 'BK-'; END IF;

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        NEW.booking_amount,
        'மஹால் முன்பதிவு (Mahal Booking)',
        NEW.applicant_name,
        NEW.event_type || ' - ' || NEW.event_date::text,
        CURRENT_DATE,
        CASE WHEN NEW.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
        prefix || UPPER(LEFT(NEW.id::text, 8)),
        NEW.id,
        'booking'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix TEXT;
BEGIN
  IF NEW.status = 'approved' AND (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') THEN
    -- Get booking prefix from app_settings
    SELECT COALESCE(value, 'BK-') INTO prefix FROM public.app_settings WHERE key = 'receipt_num_prefix_booking';
    IF prefix IS NULL THEN prefix := 'BK-'; END IF;

    INSERT INTO public.income (
      amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
    ) VALUES (
      NEW.booking_amount,
      'மஹால் முன்பதிவு (Mahal Booking)',
      NEW.applicant_name,
      NEW.event_type || ' - ' || NEW.event_date::text,
      CURRENT_DATE,
      CASE WHEN NEW.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
      prefix || UPPER(LEFT(NEW.id::text, 8)),
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Also update existing booking income records that have NULL receipt_number
UPDATE public.income 
SET receipt_number = COALESCE(
  (SELECT value FROM public.app_settings WHERE key = 'receipt_num_prefix_booking'), 
  'BK-'
) || UPPER(LEFT(reference_id::text, 8))
WHERE reference_type = 'booking' AND receipt_number IS NULL;
