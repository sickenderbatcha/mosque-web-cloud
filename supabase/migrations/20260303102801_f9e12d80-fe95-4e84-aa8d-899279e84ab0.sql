-- Fix triggers: create income when payment is completed, regardless of booking approval status.
-- This matches real-world flow: money received = income record needed = receipt number generated.

-- 1) Update INSERT trigger to fire on payment completion regardless of status
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
      CURRENT_DATE,
      CASE WHEN NEW.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
      receipt_num,
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Update UPDATE trigger to fire on payment completion regardless of status
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
        CURRENT_DATE,
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

-- 3) Backfill missing income records for paid bookings that have no income entry
DO $$
DECLARE
  v_booking RECORD;
  v_receipt_num TEXT;
BEGIN
  FOR v_booking IN
    SELECT mb.id, mb.applicant_name, mb.event_type, mb.event_date, mb.booking_amount, mb.payment_status, mb.created_at
    FROM public.mahal_bookings mb
    WHERE mb.payment_status IN ('paid', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.income i WHERE i.reference_id = mb.id AND i.reference_type = 'booking'
      )
    ORDER BY mb.created_at ASC
  LOOP
    v_receipt_num := public.get_next_receipt_number('booking');

    INSERT INTO public.income (
      amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
    ) VALUES (
      v_booking.booking_amount,
      'மஹால் முன்பதிவு (Mahal Booking)',
      v_booking.applicant_name,
      v_booking.event_type || ' - ' || v_booking.event_date::text,
      v_booking.created_at::date,
      CASE WHEN v_booking.payment_status = 'completed' THEN 'Online' ELSE 'Cash' END,
      v_receipt_num,
      v_booking.id,
      'booking'
    );
  END LOOP;
END $$;