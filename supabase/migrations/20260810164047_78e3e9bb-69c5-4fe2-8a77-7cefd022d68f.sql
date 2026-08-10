-- 1. Public financial data -> authenticated only
DROP POLICY IF EXISTS "Anyone can view income" ON public.income;
CREATE POLICY "Authenticated users can view income"
ON public.income FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view expenses" ON public.expenses;
CREATE POLICY "Authenticated users can view expenses"
ON public.expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view marriage registers" ON public.marriage_registers;
CREATE POLICY "Authenticated users can view marriage registers"
ON public.marriage_registers FOR SELECT TO authenticated USING (true);

-- 2. Rental agreements -> admins only
DROP POLICY IF EXISTS "Anyone can view rental agreements" ON public.rental_agreements;

-- 3. Subscription slots -> admins only (public donation flow uses RPC below)
DROP POLICY IF EXISTS "Anyone can view subscription slots" ON public.subscription_slots;

CREATE OR REPLACE FUNCTION public.get_paid_subscription_months(_member_id text)
RETURNS TABLE(year integer, month integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.year, s.month
  FROM public.subscription_slots s
  WHERE s.member_id = _member_id AND s.is_paid = true;
$$;

-- 4. Subscriptions -> admins only; receipt lookup by id via RPC
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.get_subscription_by_id(_id uuid)
RETURNS SETOF public.subscriptions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM public.subscriptions WHERE id = _id;
$$;

-- 5. Death registers -> admins only, plus authenticated search/detail RPCs
DROP POLICY IF EXISTS "Authenticated users can view death registers" ON public.death_registers;

CREATE OR REPLACE FUNCTION public.search_death_registers(_day integer, _month text, _year integer)
RETURNS TABLE(id uuid, deceased_name text, deceased_father_name text, gregorian_day integer, gregorian_month text, gregorian_year integer, death_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT d.id, d.deceased_name, d.deceased_father_name, d.gregorian_day, d.gregorian_month, d.gregorian_year, d.death_date
  FROM public.death_registers d
  WHERE d.gregorian_day = _day AND d.gregorian_month = _month AND d.gregorian_year = _year;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_death_register(_id uuid)
RETURNS SETOF public.death_registers
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY SELECT * FROM public.death_registers d WHERE d.id = _id;
END;
$$;

-- 6. Members -> self + admins, plus narrow authenticated RPCs
DROP POLICY IF EXISTS "Authenticated users can view active members" ON public.gb_members;
CREATE POLICY "Members can view their own record"
ON public.gb_members FOR SELECT TO authenticated
USING (auth.uid() = auth_user_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view family members" ON public.gb_family_members;
CREATE POLICY "Members can view their own family members"
ON public.gb_family_members FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.gb_members m
  WHERE m.id = gb_family_members.member_id
    AND (m.auth_user_id = auth.uid() OR m.user_id = auth.uid())
));

CREATE OR REPLACE FUNCTION public.get_member_public_info(_member_id text)
RETURNS TABLE(id uuid, member_id text, full_name text, father_name text, family_name text, address text, phone text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT m.id, m.member_id, m.full_name, m.father_name, m.family_name, m.address, m.phone
  FROM public.gb_members m
  WHERE m.member_id = _member_id AND m.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blood_donors()
RETURNS TABLE(id uuid, member_id text, full_name text, phone text, address text, blood_group public.blood_group, photo_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT m.id, m.member_id, m.full_name, m.phone, m.address, m.blood_group, m.photo_url
  FROM public.gb_members m
  WHERE m.is_active = true AND m.blood_group IS NOT NULL
  ORDER BY m.blood_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_family(_member_id text)
RETURNS TABLE(member_uuid uuid, member_full_name text, name text, relationship public.family_relationship, marital_status public.marital_status, date_of_birth date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT m.id, m.full_name, f.name, f.relationship, f.marital_status, f.date_of_birth
  FROM public.gb_members m
  LEFT JOIN public.gb_family_members f ON f.member_id = m.id
  WHERE m.member_id = _member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_non_admin_gb_members()
RETURNS SETOF public.gb_members
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT gm.*
  FROM public.gb_members gm
  WHERE gm.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = gm.auth_user_id
        AND ur.role IN ('admin'::public.app_role, 'superadmin'::public.app_role)
    )
  ORDER BY gm.member_id;
END;
$$;

-- 7. Certificate payments: ownership enforced on insert
DROP POLICY IF EXISTS "Anyone can create certificate payments" ON public.certificate_payments;
CREATE POLICY "Users can create their own certificate payments"
ON public.certificate_payments FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR has_tab_permission(auth.uid(), 'certificate-payments')
);

-- 8. Lock down execute rights on SECURITY DEFINER routines
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Needed inside RLS policy expressions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_tab_permission(uuid, text) TO anon, authenticated;
-- Public-facing mahal booking flow
GRANT EXECUTE ON FUNCTION public.get_mahal_availability(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_mahal_booking_conflict(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_mahal_booking(text, text, text, text, date, text, text, integer, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_mahal_booking_admin_override(text, text, text, text, date, text, text, integer, text, numeric) TO authenticated;
-- Public donation flow
GRANT EXECUTE ON FUNCTION public.get_paid_subscription_months(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_by_id(uuid) TO anon, authenticated;
-- Authenticated member/service lookups
GRANT EXECUTE ON FUNCTION public.search_death_registers(integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_death_register(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_public_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blood_donors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_family(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_non_admin_gb_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_document_number_for_type(text) TO authenticated;