-- Fix trigger functions to use 'paid' instead of 'completed'

-- Drop and recreate the function for INSERT trigger
CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.payment_status = 'paid' THEN
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
      NEW.booking_amount,
      'மஹால் முன்பதிவு (Mahal Booking)',
      NEW.applicant_name,
      NEW.event_type || ' - ' || NEW.event_date::text,
      CURRENT_DATE,
      'Cash',
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate the function for UPDATE trigger
CREATE OR REPLACE FUNCTION public.add_booking_to_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only add to income when booking is approved and payment is paid
  -- and it wasn't already in that state before
  IF NEW.status = 'approved' AND NEW.payment_status = 'paid' AND 
     (OLD.status != 'approved' OR OLD.payment_status != 'paid' OR OLD.status IS NULL OR OLD.payment_status IS NULL) THEN
    -- Check if income already exists for this booking
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'booking') THEN
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
        NEW.booking_amount,
        'மஹால் முன்பதிவு (Mahal Booking)',
        NEW.applicant_name,
        NEW.event_type || ' - ' || NEW.event_date::text,
        CURRENT_DATE,
        'Cash',
        NEW.id,
        'booking'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;