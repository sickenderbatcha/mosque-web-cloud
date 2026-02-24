
-- =============================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- =============================================

-- =============================================
-- STEP 1: Fix password_reset_tokens - Remove public SELECT
-- Prevents attackers from reading reset tokens to hijack accounts
-- =============================================
DROP POLICY IF EXISTS "Anyone can verify reset tokens" ON public.password_reset_tokens;
-- Token verification is done server-side via service role key, no client SELECT needed

-- =============================================
-- STEP 2: Restrict gb_members to authenticated users only
-- Protects 1500+ member records (PII: phones, emails, addresses)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view active members" ON public.gb_members;
CREATE POLICY "Authenticated users can view active members"
  ON public.gb_members FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- =============================================
-- STEP 3: Restrict gb_family_members to authenticated users
-- =============================================
DROP POLICY IF EXISTS "Anyone can view family members" ON public.gb_family_members;
CREATE POLICY "Authenticated users can view family members"
  ON public.gb_family_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- STEP 4: Restrict death_registers to admin/superadmin
-- Protects sensitive deceased info, cause of death, informant contacts
-- =============================================
DROP POLICY IF EXISTS "Anyone can view death registers" ON public.death_registers;
CREATE POLICY "Admins can view death registers"
  ON public.death_registers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- =============================================
-- STEP 5: Fix pending_users DELETE policy
-- Old policy allowed ANY anonymous user to delete ANY pending registration
-- New policy: no direct client-side deletion; handled via edge function with phone verification
-- =============================================
DROP POLICY IF EXISTS "Anyone can delete their own pending registration" ON public.pending_users;

-- =============================================
-- STEP 6: Fix database functions missing search_path
-- =============================================
CREATE OR REPLACE FUNCTION public.record_outside_marriage_certificate_payment_income()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  category_name TEXT;
BEGIN
  IF NEW.payment_status = 'completed' AND NEW.certificate_type = 'outside_marriage' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.income 
      WHERE reference_type = 'certificate_payment' 
      AND reference_id = NEW.id
    ) THEN
      INSERT INTO public.income (
        amount,
        category,
        source,
        description,
        payment_method,
        income_date,
        reference_type,
        reference_id
      ) VALUES (
        NEW.amount,
        'வெளியூர் திருமண சான்றிதழ் (Outside Marriage Certificate)',
        NEW.applicant_name,
        'வெளியூர் திருமண சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'),
        CURRENT_DATE,
        'certificate_payment',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_certificate_payment_income()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  category_name TEXT;
BEGIN
  IF NEW.payment_status = 'completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.income 
      WHERE reference_type = 'certificate_payment' 
      AND reference_id = NEW.id
    ) THEN
      category_name := CASE NEW.certificate_type
        WHEN 'marriage' THEN 'திருமண சான்றிதழ் (Marriage Certificate)'
        WHEN 'death' THEN 'இறப்புச் சான்றிதழ் (Death Certificate)'
        WHEN 'bonafide' THEN 'போனாஃபைட் சான்றிதழ் (Bonafide Certificate)'
        WHEN 'noc' THEN 'ஆட்சேபனையின்மை சான்றிதழ் (NOC)'
        WHEN 'outside_marriage' THEN 'வெளியூர் திருமண சான்றிதழ் (Outside Marriage Certificate)'
        ELSE 'சான்றிதழ் கட்டணம் (Certificate Fee)'
      END;

      INSERT INTO public.income (
        amount,
        category,
        source,
        description,
        payment_method,
        income_date,
        reference_type,
        reference_id
      ) VALUES (
        NEW.amount,
        category_name,
        NEW.applicant_name,
        'சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'),
        CURRENT_DATE,
        'certificate_payment',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
