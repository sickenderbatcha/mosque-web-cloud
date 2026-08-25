CREATE OR REPLACE FUNCTION public.create_subscription(
  _member_id text,
  _member_name text,
  _member_phone text,
  _member_address text,
  _subscription_type text,
  _amount numeric,
  _total_amount numeric,
  _from_month integer,
  _from_year integer,
  _to_month integer,
  _to_year integer,
  _number_of_months integer,
  _subscription_year integer,
  _payment_status text,
  _payment_method text,
  _transaction_id text DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.subscriptions;
BEGIN
  IF _member_id IS NULL OR btrim(_member_id) = '' THEN
    RAISE EXCEPTION 'Member ID is required';
  END IF;
  IF _total_amount IS NULL OR _total_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid subscription amount';
  END IF;
  IF _payment_status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;

  INSERT INTO public.subscriptions (
    member_id, member_name, member_phone, member_address, subscription_type,
    amount, total_amount, from_month, from_year, to_month, to_year,
    number_of_months, subscription_year, payment_status, payment_method, transaction_id
  ) VALUES (
    upper(btrim(_member_id)), _member_name, _member_phone, _member_address, _subscription_type,
    _amount, _total_amount, _from_month, _from_year, _to_month, _to_year,
    _number_of_months, _subscription_year, _payment_status, _payment_method, _transaction_id
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_subscription(text,text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_subscription(text,text,text,text,text,numeric,numeric,integer,integer,integer,integer,integer,integer,text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_subscriptions()
RETURNS TABLE (
  id uuid,
  member_id text,
  member_name text,
  subscription_type text,
  amount numeric,
  total_amount numeric,
  from_month integer,
  from_year integer,
  to_month integer,
  to_year integer,
  number_of_months integer,
  subscription_year integer,
  payment_status text,
  payment_method text,
  transaction_id text,
  razorpay_payment_id text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.member_id, s.member_name, s.subscription_type, s.amount, s.total_amount,
         s.from_month, s.from_year, s.to_month, s.to_year, s.number_of_months,
         s.subscription_year, s.payment_status, s.payment_method, s.transaction_id,
         s.razorpay_payment_id, s.created_at
  FROM public.subscriptions s
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.gb_members m
      WHERE (m.auth_user_id = auth.uid() OR m.user_id = auth.uid())
        AND (
          upper(btrim(m.member_id)) = upper(btrim(s.member_id))
          OR (
            m.phone IS NOT NULL AND s.member_phone IS NOT NULL
            AND right(regexp_replace(m.phone, '\D', '', 'g'), 10)
                = right(regexp_replace(s.member_phone, '\D', '', 'g'), 10)
          )
        )
    )
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_subscriptions() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_subscriptions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_donations()
RETURNS TABLE (
  id uuid,
  donor_name text,
  donor_phone text,
  donor_email text,
  amount numeric,
  purpose text,
  payment_method text,
  payment_status text,
  transaction_id text,
  razorpay_payment_id text,
  receipt_number text,
  is_anonymous boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.donor_name, d.donor_phone, d.donor_email, d.amount, d.purpose,
         d.payment_method, d.payment_status, d.transaction_id, d.razorpay_payment_id,
         d.receipt_number, d.is_anonymous, d.created_at
  FROM public.donations d
  WHERE auth.uid() IS NOT NULL
    AND d.donor_phone IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.gb_members m
      WHERE (m.auth_user_id = auth.uid() OR m.user_id = auth.uid())
        AND m.phone IS NOT NULL
        AND right(regexp_replace(m.phone, '\D', '', 'g'), 10)
            = right(regexp_replace(d.donor_phone, '\D', '', 'g'), 10)
    )
  ORDER BY d.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_donations() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_donations() TO authenticated, service_role;