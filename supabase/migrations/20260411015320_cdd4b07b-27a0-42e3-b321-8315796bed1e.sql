
CREATE OR REPLACE FUNCTION public.create_mahal_booking_admin_override(
  _applicant_name text,
  _applicant_phone text,
  _applicant_email text DEFAULT NULL::text,
  _event_type text DEFAULT NULL::text,
  _event_date date DEFAULT NULL::date,
  _start_time text DEFAULT NULL::text,
  _end_time text DEFAULT NULL::text,
  _expected_guests integer DEFAULT NULL::integer,
  _special_requirements text DEFAULT NULL::text,
  _booking_amount numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
  _caller_id uuid := auth.uid();
BEGIN
  -- Verify caller is admin, superadmin, or has bookings tab permission
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _caller_id
      AND role IN ('admin'::public.app_role, 'superadmin'::public.app_role)
  ) AND NOT public.has_tab_permission(_caller_id, 'bookings') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin role or bookings permission required';
  END IF;

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

  INSERT INTO public.mahal_bookings (
    user_id, applicant_name, applicant_phone, applicant_email,
    event_type, event_date, start_time, end_time,
    expected_guests, special_requirements, booking_amount,
    status, payment_status, admin_notes
  ) VALUES (
    _caller_id, _applicant_name, _applicant_phone,
    NULLIF(btrim(COALESCE(_applicant_email, '')), ''),
    _event_type, _event_date, _start_time::time, _end_time::time,
    _expected_guests, NULLIF(btrim(COALESCE(_special_requirements, '')), ''),
    _booking_amount, 'pending'::public.booking_status, 'pending',
    'Admin override: booked on an already-reserved date'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
