-- 1. Lock OTP tokens to the service role only
DROP POLICY IF EXISTS "Service role can manage OTP tokens" ON public.booking_otp_tokens;
CREATE POLICY "Service role can manage OTP tokens"
ON public.booking_otp_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.booking_otp_tokens FROM anon, authenticated;
GRANT ALL ON public.booking_otp_tokens TO service_role;

-- 2. Member photo writes require admin/superadmin
DROP POLICY IF EXISTS "Admins can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update member photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete member photos" ON storage.objects;

CREATE POLICY "Admins can upload member photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);

CREATE POLICY "Admins can update member photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
)
WITH CHECK (
  bucket_id = 'member-photos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);

CREATE POLICY "Admins can delete member photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);

-- 3. SECURITY DEFINER functions: remove anonymous execute and add in-function checks
CREATE OR REPLACE FUNCTION public.get_subscription_by_id(_id uuid)
RETURNS SETOF public.subscriptions
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT s.*
  FROM public.subscriptions s
  WHERE s.id = _id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'superadmin')
      OR EXISTS (
        SELECT 1 FROM public.gb_members m
        WHERE m.auth_user_id = auth.uid()
          AND m.member_id = s.member_id
      )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_paid_subscription_months(_member_id text)
RETURNS TABLE(year integer, month integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT s.year, s.month
  FROM public.subscription_slots s
  WHERE s.member_id = _member_id AND s.is_paid = true;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_subscription_by_id(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_paid_subscription_months(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_subscription_by_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_paid_subscription_months(text) TO authenticated, service_role;

-- Trigger-only / internal definer functions must not be callable from the API
REVOKE ALL ON FUNCTION public.get_next_receipt_number(text, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.generate_document_number_for_type(text) FROM anon, public;
REVOKE ALL ON FUNCTION public.cleanup_expired_otp_tokens() FROM anon, authenticated, public;