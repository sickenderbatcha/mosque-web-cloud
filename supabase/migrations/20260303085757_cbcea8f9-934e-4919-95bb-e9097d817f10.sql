
-- Create receipt sequences table for atomic sequential numbering
CREATE TABLE public.receipt_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_type text NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_type, year)
);

-- Enable RLS
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage
CREATE POLICY "Admins can manage receipt sequences"
ON public.receipt_sequences
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone to read (needed for receipt display)
CREATE POLICY "Anyone can view receipt sequences"
ON public.receipt_sequences
FOR SELECT
USING (true);

-- Atomic function to get next receipt number
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(
  p_receipt_type text,
  p_prefix text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_next_number integer;
  v_prefix text;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;

  -- Get configured prefix from app_settings if not provided
  IF p_prefix IS NULL THEN
    SELECT COALESCE(value, '') INTO v_prefix
    FROM public.app_settings
    WHERE key = CASE p_receipt_type
      WHEN 'booking' THEN 'receipt_num_prefix_booking'
      WHEN 'donation' THEN 'receipt_num_prefix_donation'
      WHEN 'subscription' THEN 'receipt_num_prefix_subscription'
      WHEN 'cash_payment' THEN 'receipt_num_prefix_cash_payment'
      WHEN 'certificate_noc' THEN 'receipt_num_prefix_cert_noc'
      WHEN 'certificate_heir' THEN 'receipt_num_prefix_cert_heir'
      WHEN 'certificate_general' THEN 'receipt_num_prefix_cert_general'
      ELSE NULL
    END;
    
    -- Fallback defaults
    IF v_prefix IS NULL THEN
      v_prefix := CASE p_receipt_type
        WHEN 'booking' THEN 'BK-'
        WHEN 'donation' THEN 'DON-'
        WHEN 'subscription' THEN 'SUB-'
        WHEN 'cash_payment' THEN 'CASH-'
        WHEN 'certificate_noc' THEN 'NOC-'
        WHEN 'certificate_heir' THEN 'HEIR-'
        WHEN 'certificate_general' THEN 'CERT-'
        ELSE 'REC-'
      END;
    END IF;
  ELSE
    v_prefix := p_prefix;
  END IF;

  -- Atomically increment with upsert and row lock
  INSERT INTO public.receipt_sequences (receipt_type, year, last_number)
  VALUES (p_receipt_type, v_year, 1)
  ON CONFLICT (receipt_type, year)
  DO UPDATE SET
    last_number = public.receipt_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;

  -- Return formatted: PREFIX + YEAR + PADDED_NUMBER e.g. BK-2026-0001
  RETURN v_prefix || v_year::text || '-' || LPAD(v_next_number::text, 4, '0');
END;
$$;

-- Now update all income-generating triggers to use sequential numbers

-- 1. Booking income trigger (UPDATE)
CREATE OR REPLACE FUNCTION public.add_booking_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  IF NEW.status = 'approved' AND (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') AND 
     (OLD.status != 'approved' OR (OLD.payment_status != 'paid' AND OLD.payment_status != 'completed') OR OLD.status IS NULL OR OLD.payment_status IS NULL) THEN
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
$$;

-- 2. Booking income trigger (INSERT)
CREATE OR REPLACE FUNCTION public.add_booking_to_income_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  IF NEW.status = 'approved' AND (NEW.payment_status = 'paid' OR NEW.payment_status = 'completed') THEN
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
$$;

-- 3. Donation income trigger
CREATE OR REPLACE FUNCTION public.add_donation_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  receipt_num := public.get_next_receipt_number('donation');

  INSERT INTO public.income (
    amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
  ) VALUES (
    NEW.amount,
    'நன்கொடை (Donation)',
    COALESCE(NEW.donor_name, 'Anonymous'),
    COALESCE(NEW.purpose, 'General Donation'),
    COALESCE(NEW.donated_at::date, CURRENT_DATE),
    COALESCE(NEW.payment_method, 'Online'),
    receipt_num,
    NEW.id,
    'donation'
  );
  RETURN NEW;
END;
$$;

-- 4. Subscription income trigger (INSERT)
CREATE OR REPLACE FUNCTION public.add_subscription_to_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      CURRENT_DATE,
      COALESCE(NEW.payment_method, 'Online'),
      receipt_num,
      NEW.id,
      'subscription'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Subscription income trigger (UPDATE)
CREATE OR REPLACE FUNCTION public.add_subscription_to_income_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        CURRENT_DATE,
        COALESCE(NEW.payment_method, 'Online'),
        receipt_num,
        NEW.id,
        'subscription'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Refund expense trigger - update receipt number format
CREATE OR REPLACE FUNCTION public.handle_approved_refund_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  payment_method_text TEXT;
  expense_description TEXT;
  receipt_num TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT applicant_name, event_type, event_date, applicant_phone
    INTO booking_record
    FROM public.mahal_bookings
    WHERE id = NEW.booking_id;

    IF NEW.refund_payment_type IS NOT NULL THEN
      payment_method_text := NEW.refund_payment_type;
    ELSIF NEW.upi_id IS NOT NULL THEN
      payment_method_text := 'UPI';
    ELSIF NEW.bank_account_number IS NOT NULL THEN
      payment_method_text := 'Bank Transfer';
    ELSE
      payment_method_text := 'Cash';
    END IF;

    expense_description := 'Refund for ' || COALESCE(booking_record.event_type, 'Booking') || 
      ' - ' || COALESCE(booking_record.applicant_name, 'N/A') ||
      ' (Phone: ' || COALESCE(booking_record.applicant_phone, 'N/A') || ')' ||
      CASE WHEN booking_record.event_date IS NOT NULL 
        THEN ' | Event Date: ' || booking_record.event_date::text 
        ELSE '' 
      END ||
      CASE WHEN NEW.reason IS NOT NULL 
        THEN ' | Reason: ' || NEW.reason 
        ELSE '' 
      END;

    -- Use sequential refund number
    SELECT 'REF-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD((COALESCE(MAX(
      CAST(NULLIF(SUBSTRING(receipt_number FROM 'REF-\d{4}-(\d+)'), '') AS INTEGER)
    ), 0) + 1)::text, 4, '0')
    INTO receipt_num
    FROM public.expenses
    WHERE receipt_number LIKE 'REF-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-%';

    INSERT INTO public.expenses (
      amount, category, expense_date, description, payment_method, vendor_name, approved_by, created_by, receipt_number
    ) VALUES (
      NEW.amount, 'Refund', CURRENT_DATE, expense_description, payment_method_text,
      COALESCE(booking_record.applicant_name, 'N/A'), NEW.processed_by, NEW.processed_by, receipt_num
    );
  END IF;
  RETURN NEW;
END;
$$;
