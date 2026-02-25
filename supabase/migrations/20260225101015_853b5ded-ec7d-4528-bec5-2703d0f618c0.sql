
-- Step 1: Fix password_reset_tokens - remove overly permissive UPDATE policy
-- Token verification is done server-side with service role key
DROP POLICY IF EXISTS "Anyone can update reset tokens" ON public.password_reset_tokens;

-- Step 2: Remove public SELECT on death_registers (sensitive data)
DROP POLICY IF EXISTS "Death registers are viewable by everyone" ON public.death_registers;

-- Step 3: Restrict gb_members to authenticated users only
-- (signup member validation will need to be handled differently)
DROP POLICY IF EXISTS "Anyone can view active members" ON public.gb_members;
CREATE POLICY "Authenticated users can view active members"
  ON public.gb_members
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Step 4: Fix pending_users - remove public DELETE if it exists, tighten INSERT
-- Currently INSERT is WITH CHECK(true) - no identity check needed for registration
-- But ensure no public SELECT/DELETE policies exist
DROP POLICY IF EXISTS "Anyone can delete pending users" ON public.pending_users;

-- Step 5: Fix search_path on two database functions
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
        amount, category, source, description, payment_method, income_date, reference_type, reference_id
      ) VALUES (
        NEW.amount, category_name, NEW.applicant_name,
        'சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'), CURRENT_DATE, 'certificate_payment', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

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
        amount, category, source, description, payment_method, income_date, reference_type, reference_id
      ) VALUES (
        NEW.amount,
        'வெளியூர் திருமண சான்றிதழ் (Outside Marriage Certificate)',
        NEW.applicant_name,
        'வெளியூர் திருமண சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'), CURRENT_DATE, 'certificate_payment', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
