
CREATE OR REPLACE FUNCTION public.add_noc_payment_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  noc_fee numeric;
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'noc_certificate') THEN
      SELECT COALESCE(value::numeric, 100) INTO noc_fee
      FROM public.app_settings
      WHERE key = 'certificate_fee_noc';
      
      IF noc_fee IS NULL THEN
        noc_fee := 100;
      END IF;

      -- Use certificate_general instead of certificate_noc so NOC gets CERT prefix
      receipt_num := public.get_next_receipt_number('certificate_general');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        noc_fee,
        'ஆட்சேபனையின்மை சான்றிதழ் (NOC)',
        NEW.applicant_name,
        'NOC சான்றிதழ் - ' || NEW.applicant_name || ' (' || NEW.father_name || ' மகன்/மகள்)',
        CURRENT_DATE,
        'Online',
        receipt_num,
        NEW.id,
        'noc_certificate'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
