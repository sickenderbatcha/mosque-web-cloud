CREATE OR REPLACE FUNCTION public.get_booking_receipt_number(_booking_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.receipt_number
  FROM public.income i
  WHERE i.reference_id = _booking_id
    AND i.reference_type = 'booking'
    AND i.receipt_number IS NOT NULL
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_receipt_number(uuid) TO anon, authenticated, service_role;