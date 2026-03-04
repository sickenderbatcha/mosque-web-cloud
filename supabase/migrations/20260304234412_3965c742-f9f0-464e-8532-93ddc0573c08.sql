-- Ensure income ledger dates use local mosque timezone instead of UTC date boundaries
CREATE OR REPLACE FUNCTION public.get_app_local_date()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') THEN
    receipt_num := public.get_next_receipt_number('booking');

    INSERT INTO public.income (
      amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
    ) VALUES (
      NEW.booking_amount,
      'மஹால் முன்பதிவு (Mahal Booking)',
      NEW.applicant_name,
      NEW.event_type || ' - ' || NEW.event_date::text,
      public.get_app_local_date(),
      CASE WHEN NEW.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
      receipt_num,
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_subscription_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' OR NEW.payment_status = 'paid' THEN
    receipt_num := public.get_next_receipt_number('subscription');

    INSERT INTO public.income (
      amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
    ) VALUES (
      NEW.total_amount,
      'சந்தா (Subscription)',
      NEW.member_name || ' (' || NEW.member_id || ')',
      NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
      public.get_app_local_date(),
      COALESCE(NEW.payment_method, 'Online'),
      receipt_num,
      NEW.id,
      'subscription'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_booking_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') AND
     (OLD.payment_status IS NULL OR (OLD.payment_status != 'paid' AND OLD.payment_status != 'completed')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'booking') THEN
      receipt_num := public.get_next_receipt_number('booking');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        NEW.booking_amount,
        'மஹால் முன்பதிவு (Mahal Booking)',
        NEW.applicant_name,
        NEW.event_type || ' - ' || NEW.event_date::text,
        public.get_app_local_date(),
        CASE WHEN NEW.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
        receipt_num,
        NEW.id,
        'booking'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_subscription_to_income_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF (NEW.payment_status = 'completed' OR NEW.payment_status = 'paid') 
     AND (OLD.payment_status IS NULL OR (OLD.payment_status != 'completed' AND OLD.payment_status != 'paid')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'subscription') THEN
      receipt_num := public.get_next_receipt_number('subscription');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        NEW.total_amount,
        'சந்தா (Subscription)',
        NEW.member_name || ' (' || NEW.member_id || ')',
        NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
        public.get_app_local_date(),
        COALESCE(NEW.payment_method, 'Online'),
        receipt_num,
        NEW.id,
        'subscription'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_certificate_payment_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'certificate_payment') THEN
      receipt_num := public.get_next_receipt_number('certificate_general');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
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
        public.get_app_local_date(),
        COALESCE(NEW.payment_method, 'Online'),
        receipt_num,
        NEW.id,
        'certificate_payment'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

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

      receipt_num := public.get_next_receipt_number('certificate_general');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        noc_fee,
        'ஆட்சேபனையின்மை சான்றிதழ் (NOC)',
        NEW.applicant_name,
        'NOC சான்றிதழ் - ' || NEW.applicant_name || ' (' || NEW.father_name || ' மகன்/மகள்)',
        public.get_app_local_date(),
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

CREATE OR REPLACE FUNCTION public.add_heir_payment_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  heir_fee numeric;
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'heir_certificate') THEN
      SELECT COALESCE(value::numeric, 100) INTO heir_fee
      FROM public.app_settings
      WHERE key = 'certificate_fee_heir';
      
      IF heir_fee IS NULL THEN
        heir_fee := 100;
      END IF;

      receipt_num := public.get_next_receipt_number('certificate_heir');

      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        heir_fee,
        'வாரிசு சான்றிதழ் (Heir Certificate)',
        NEW.applicant_name,
        'வாரிசு சான்றிதழ் - ' || NEW.deceased_name || ' (' || NEW.deceased_father_name || ' மகன்/மகள்)',
        public.get_app_local_date(),
        'Online',
        receipt_num,
        NEW.id,
        'heir_certificate'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_certificate_payment_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  category_name TEXT;
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.income 
      WHERE reference_type = 'certificate_payment' 
      AND reference_id = NEW.id
    ) THEN
      category_name := CASE NEW.certificate_type
        WHEN 'marriage' THEN 'திருமண சான்றிதழ் (Marriage Certificate)'
        WHEN 'death' THEN 'இறப்புச் சான்றிதழ் (Death Certificate)'
        WHEN 'bonafide' THEN 'போனாஃபைட் சான்றிதழ் (Bonafide Certificate)'
        WHEN 'noc' THEN 'ஆட்சேபனையின்மை சான்றிதழ் (NOC)'
        WHEN 'outside_marriage' THEN 'வெளியூர் திருமண சான்றிதழ் (Outside Marriage Certificate)'
        ELSE 'சான்றிதழ் கட்டணம் (Certificate Fee)'
      END;

      receipt_num := public.get_next_receipt_number('certificate_general');

      INSERT INTO public.income (
        amount, category, source, description, payment_method, income_date, receipt_number, reference_type, reference_id
      ) VALUES (
        NEW.amount, category_name, NEW.applicant_name,
        'சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'), public.get_app_local_date(), receipt_num, 'certificate_payment', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_outside_marriage_certificate_payment_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt_num TEXT;
BEGIN
  IF NEW.payment_status = 'completed' AND NEW.certificate_type = 'outside_marriage' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.income 
      WHERE reference_type = 'certificate_payment' 
      AND reference_id = NEW.id
    ) THEN
      receipt_num := public.get_next_receipt_number('certificate_general');

      INSERT INTO public.income (
        amount, category, source, description, payment_method, income_date, receipt_number, reference_type, reference_id
      ) VALUES (
        NEW.amount,
        'வெளியூர் திருமண சான்றிதழ் (Outside Marriage Certificate)',
        NEW.applicant_name,
        'வெளியூர் திருமண சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'), public.get_app_local_date(), receipt_num, 'certificate_payment', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;