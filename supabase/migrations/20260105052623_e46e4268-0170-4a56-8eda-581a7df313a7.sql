
-- Function to add income from donations
CREATE OR REPLACE FUNCTION public.add_donation_to_income()
RETURNS TRIGGER AS $$
BEGIN
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
    'நன்கொடை (Donation)',
    COALESCE(NEW.donor_name, 'Anonymous'),
    COALESCE(NEW.purpose, 'General Donation'),
    COALESCE(NEW.donated_at::date, CURRENT_DATE),
    COALESCE(NEW.payment_method, 'Online'),
    NEW.receipt_number,
    NEW.id,
    'donation'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for donations
DROP TRIGGER IF EXISTS trigger_donation_to_income ON public.donations;
CREATE TRIGGER trigger_donation_to_income
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_donation_to_income();

-- Function to add income from subscriptions
CREATE OR REPLACE FUNCTION public.add_subscription_to_income()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to income when payment is completed
  IF NEW.payment_status = 'completed' THEN
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
      NEW.total_amount,
      'சந்தா (Subscription)',
      NEW.member_name || ' (' || NEW.member_id || ')',
      NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
      CURRENT_DATE,
      COALESCE(NEW.payment_method, 'Online'),
      NEW.transaction_id,
      NEW.id,
      'subscription'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for subscriptions (on insert with completed status)
DROP TRIGGER IF EXISTS trigger_subscription_to_income ON public.subscriptions;
CREATE TRIGGER trigger_subscription_to_income
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_subscription_to_income();

-- Trigger for subscription updates (when payment status changes to completed)
CREATE OR REPLACE FUNCTION public.add_subscription_to_income_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to income when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
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
      NEW.total_amount,
      'சந்தா (Subscription)',
      NEW.member_name || ' (' || NEW.member_id || ')',
      NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
      CURRENT_DATE,
      COALESCE(NEW.payment_method, 'Online'),
      NEW.transaction_id,
      NEW.id,
      'subscription'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_subscription_to_income_update ON public.subscriptions;
CREATE TRIGGER trigger_subscription_to_income_update
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_subscription_to_income_on_update();

-- Function to add income from mahal bookings
CREATE OR REPLACE FUNCTION public.add_booking_to_income()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to income when booking is approved and payment is completed
  IF NEW.status = 'approved' AND NEW.payment_status = 'completed' AND 
     (OLD.status != 'approved' OR OLD.payment_status != 'completed' OR OLD.status IS NULL OR OLD.payment_status IS NULL) THEN
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
      'Online',
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_booking_to_income ON public.mahal_bookings;
CREATE TRIGGER trigger_booking_to_income
  AFTER UPDATE ON public.mahal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.add_booking_to_income();

-- Also handle insert for bookings that are immediately approved and paid
CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.payment_status = 'completed' THEN
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
      'Online',
      NEW.id,
      'booking'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_booking_to_income_insert ON public.mahal_bookings;
CREATE TRIGGER trigger_booking_to_income_insert
  AFTER INSERT ON public.mahal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.add_booking_to_income_on_insert();
