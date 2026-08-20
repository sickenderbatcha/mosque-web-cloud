ALTER TABLE public.certificate_payments
  DROP CONSTRAINT certificate_payments_certificate_type_check;
ALTER TABLE public.certificate_payments
  ADD CONSTRAINT certificate_payments_certificate_type_check
  CHECK (certificate_type = ANY (ARRAY['marriage'::text, 'death'::text, 'bonafide'::text, 'noc'::text, 'heir'::text]));

CREATE OR REPLACE FUNCTION public.settle_heir_cash_payment_request(_request_id uuid)
RETURNS TABLE(payment_id uuid, receipt_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.cash_payment_requests%ROWTYPE;
  v_payment_id uuid;
  v_receipt_number text;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    OR public.has_tab_permission(auth.uid(), 'cash-requests')
  ) THEN
    RAISE EXCEPTION 'Not authorized to settle cash payment requests';
  END IF;

  SELECT * INTO v_request
  FROM public.cash_payment_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash payment request not found';
  END IF;

  IF v_request.service_type <> 'heir' THEN
    RAISE EXCEPTION 'This settlement action only supports heir certificate requests';
  END IF;

  IF v_request.status NOT IN ('approved', 'paid') THEN
    RAISE EXCEPTION 'Cash payment request must be approved before settlement';
  END IF;

  IF v_request.reference_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.heir_certificates WHERE id = v_request.reference_id
  ) THEN
    RAISE EXCEPTION 'No heir certificate record is linked to this request';
  END IF;

  SELECT cp.id INTO v_payment_id
  FROM public.certificate_payments cp
  WHERE cp.reference_id = v_request.reference_id
    AND cp.certificate_type = 'heir'
  ORDER BY cp.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.certificate_payments (
      certificate_type,
      reference_id,
      user_id,
      applicant_name,
      applicant_phone,
      applicant_email,
      amount,
      payment_status,
      payment_method,
      transaction_id
    ) VALUES (
      'heir',
      v_request.reference_id,
      v_request.user_id,
      v_request.applicant_name,
      v_request.applicant_phone,
      v_request.applicant_email,
      v_request.amount,
      'pending',
      'cash',
      'CASH-' || upper(substr(v_request.id::text, 1, 8))
    )
    RETURNING id INTO v_payment_id;
  END IF;

  UPDATE public.certificate_payments
  SET payment_status = 'completed',
      payment_method = 'cash',
      amount = v_request.amount,
      applicant_name = v_request.applicant_name,
      applicant_phone = v_request.applicant_phone,
      applicant_email = v_request.applicant_email,
      user_id = COALESCE(user_id, v_request.user_id),
      transaction_id = COALESCE(transaction_id, 'CASH-' || upper(substr(v_request.id::text, 1, 8)))
  WHERE id = v_payment_id;

  UPDATE public.heir_certificates
  SET payment_status = 'completed',
      status = 'approved',
      approved_by = COALESCE(approved_by, auth.uid()),
      approved_at = COALESCE(approved_at, now()),
      updated_at = now()
  WHERE id = v_request.reference_id;

  UPDATE public.cash_payment_requests
  SET status = 'paid',
      processed_by = COALESCE(auth.uid(), processed_by),
      processed_at = now(),
      updated_at = now()
  WHERE id = v_request.id;

  SELECT i.receipt_number INTO v_receipt_number
  FROM public.income i
  WHERE i.reference_id = v_payment_id
    AND i.reference_type = 'certificate_payment'
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF v_receipt_number IS NULL THEN
    RAISE EXCEPTION 'Receipt number was not generated';
  END IF;

  RETURN QUERY SELECT v_payment_id, v_receipt_number;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_heir_cash_payment_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_heir_cash_payment_request(uuid) TO authenticated, service_role;

DO $$
DECLARE
  v_request public.cash_payment_requests%ROWTYPE;
  v_payment_id uuid;
BEGIN
  FOR v_request IN
    SELECT c.*
    FROM public.cash_payment_requests c
    WHERE c.service_type = 'heir'
      AND c.status = 'approved'
      AND c.reference_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.heir_certificates h WHERE h.id = c.reference_id)
    FOR UPDATE
  LOOP
    SELECT cp.id INTO v_payment_id
    FROM public.certificate_payments cp
    WHERE cp.reference_id = v_request.reference_id
      AND cp.certificate_type = 'heir'
    ORDER BY cp.created_at DESC
    LIMIT 1;

    IF v_payment_id IS NULL THEN
      INSERT INTO public.certificate_payments (
        certificate_type, reference_id, user_id, applicant_name, applicant_phone,
        applicant_email, amount, payment_status, payment_method, transaction_id
      ) VALUES (
        'heir', v_request.reference_id, v_request.user_id, v_request.applicant_name,
        v_request.applicant_phone, v_request.applicant_email, v_request.amount,
        'pending', 'cash', 'CASH-' || upper(substr(v_request.id::text, 1, 8))
      ) RETURNING id INTO v_payment_id;
    END IF;

    UPDATE public.certificate_payments
    SET payment_status = 'completed', payment_method = 'cash', amount = v_request.amount,
        applicant_name = v_request.applicant_name, applicant_phone = v_request.applicant_phone,
        applicant_email = v_request.applicant_email, user_id = COALESCE(user_id, v_request.user_id),
        transaction_id = COALESCE(transaction_id, 'CASH-' || upper(substr(v_request.id::text, 1, 8)))
    WHERE id = v_payment_id;

    UPDATE public.heir_certificates
    SET payment_status = 'completed', status = 'approved',
        approved_at = COALESCE(approved_at, now()), updated_at = now()
    WHERE id = v_request.reference_id;

    UPDATE public.cash_payment_requests
    SET status = 'paid', processed_at = now(), updated_at = now()
    WHERE id = v_request.id;
  END LOOP;
END;
$$;