CREATE OR REPLACE FUNCTION public.add_booking_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  IF (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed')
     AND (OLD.payment_status IS NULL OR (OLD.payment_status != 'paid' AND OLD.payment_status != 'completed')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'booking') THEN
      receipt_num := public.get_next_receipt_number('booking', NULL);

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
$$;

CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  IF (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'booking') THEN
      receipt_num := public.get_next_receipt_number('booking', NULL);

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
$$;

DROP TRIGGER IF EXISTS trigger_add_booking_to_income_on_insert ON public.mahal_bookings;
DROP TRIGGER IF EXISTS trigger_booking_to_income_insert ON public.mahal_bookings;
DROP TRIGGER IF EXISTS trigger_add_booking_to_income_on_update ON public.mahal_bookings;
DROP TRIGGER IF EXISTS trigger_booking_to_income ON public.mahal_bookings;
DROP TRIGGER IF EXISTS update_mahal_bookings_updated_at ON public.mahal_bookings;