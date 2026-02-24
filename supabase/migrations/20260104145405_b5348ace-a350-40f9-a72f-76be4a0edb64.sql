-- SECURITY FIX: Do NOT allow public SELECT on mahal_bookings (contains PII)

-- 1) Replace overly-permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view bookings for availability" ON public.mahal_bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.mahal_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.mahal_bookings;

-- Only admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.mahal_bookings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authenticated users can view their own bookings
CREATE POLICY "Users can view their own bookings"
ON public.mahal_bookings
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2) Tighten UPDATE policy: guests should not be able to update arbitrary rows
DROP POLICY IF EXISTS "Users can update their own pending bookings" ON public.mahal_bookings;

CREATE POLICY "Users can update their own pending bookings"
ON public.mahal_bookings
FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
   OR (auth.uid() IS NOT NULL AND auth.uid() = user_id))
  AND status = 'pending'::public.booking_status
);

-- 3) Public, minimal-data API via security-definer functions for availability + conflict checks

CREATE OR REPLACE FUNCTION public.get_mahal_availability(_start date, _end date)
RETURNS TABLE (
  event_date date,
  event_type text,
  status public.booking_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_date::date, event_type, status
  FROM public.mahal_bookings
  WHERE event_date::date BETWEEN _start AND _end
    AND status IN ('approved'::public.booking_status, 'pending'::public.booking_status);
$$;

GRANT EXECUTE ON FUNCTION public.get_mahal_availability(date, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_mahal_booking_conflict(_event_date date)
RETURNS TABLE (
  has_conflict boolean,
  has_approved boolean,
  has_pending boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS(
      SELECT 1 FROM public.mahal_bookings b
      WHERE b.event_date::date = _event_date
        AND b.status IN ('approved'::public.booking_status, 'pending'::public.booking_status)
    ) AS has_conflict,
    EXISTS(
      SELECT 1 FROM public.mahal_bookings b
      WHERE b.event_date::date = _event_date
        AND b.status = 'approved'::public.booking_status
    ) AS has_approved,
    EXISTS(
      SELECT 1 FROM public.mahal_bookings b
      WHERE b.event_date::date = _event_date
        AND b.status = 'pending'::public.booking_status
    ) AS has_pending;
$$;

GRANT EXECUTE ON FUNCTION public.check_mahal_booking_conflict(date) TO anon, authenticated;

-- 4) Create booking via security-definer function so guests can create & receive booking_id without SELECT access

CREATE OR REPLACE FUNCTION public.create_mahal_booking(
  _applicant_name text,
  _applicant_phone text,
  _applicant_email text,
  _event_type text,
  _event_date date,
  _start_time text,
  _end_time text,
  _expected_guests integer,
  _special_requirements text,
  _booking_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Basic server-side validation (defense-in-depth)
  IF _applicant_name IS NULL OR btrim(_applicant_name) = '' OR char_length(_applicant_name) > 100 THEN
    RAISE EXCEPTION 'INVALID_APPLICANT_NAME';
  END IF;

  IF _applicant_phone IS NULL OR btrim(_applicant_phone) = '' OR char_length(_applicant_phone) > 15 THEN
    RAISE EXCEPTION 'INVALID_APPLICANT_PHONE';
  END IF;

  IF _event_type IS NULL OR btrim(_event_type) = '' OR char_length(_event_type) > 50 THEN
    RAISE EXCEPTION 'INVALID_EVENT_TYPE';
  END IF;

  IF _start_time IS NULL OR btrim(_start_time) = '' OR char_length(_start_time) > 10 THEN
    RAISE EXCEPTION 'INVALID_START_TIME';
  END IF;

  IF _end_time IS NULL OR btrim(_end_time) = '' OR char_length(_end_time) > 10 THEN
    RAISE EXCEPTION 'INVALID_END_TIME';
  END IF;

  IF _booking_amount IS NULL OR _booking_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_BOOKING_AMOUNT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.mahal_bookings b
    WHERE b.event_date::date = _event_date
      AND b.status IN ('approved'::public.booking_status, 'pending'::public.booking_status)
  ) THEN
    RAISE EXCEPTION 'DATE_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.mahal_bookings (
    user_id,
    applicant_name,
    applicant_phone,
    applicant_email,
    event_type,
    event_date,
    start_time,
    end_time,
    expected_guests,
    special_requirements,
    booking_amount,
    status,
    payment_status
  ) VALUES (
    auth.uid(),
    _applicant_name,
    _applicant_phone,
    NULLIF(btrim(COALESCE(_applicant_email, '')), ''),
    _event_type,
    _event_date,
    _start_time,
    _end_time,
    _expected_guests,
    NULLIF(btrim(COALESCE(_special_requirements, '')), ''),
    _booking_amount,
    'pending'::public.booking_status,
    'pending'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mahal_booking(text, text, text, text, date, text, text, integer, text, numeric) TO anon, authenticated;