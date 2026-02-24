
-- Create outside_marriage_registers table (identical schema to marriage_registers)
CREATE TABLE public.outside_marriage_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NULL,
  hijri_year INTEGER NOT NULL,
  hijri_month TEXT NOT NULL,
  hijri_day INTEGER NOT NULL,
  gregorian_year INTEGER NOT NULL,
  gregorian_month TEXT NOT NULL,
  gregorian_day INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  day_name_en TEXT NULL,
  day_night TEXT NOT NULL,
  time_of_event TEXT NOT NULL,
  place_of_marriage TEXT NULL,
  place_of_marriage_en TEXT NULL,
  groom_name TEXT NOT NULL,
  groom_name_en TEXT NULL,
  groom_father_name TEXT NOT NULL,
  groom_father_name_en TEXT NULL,
  groom_category TEXT NULL,
  groom_address TEXT NOT NULL,
  groom_age INTEGER NOT NULL,
  groom_madhab TEXT NULL,
  bride_name TEXT NOT NULL,
  bride_name_en TEXT NULL,
  bride_father_name TEXT NOT NULL,
  bride_father_name_en TEXT NULL,
  bride_category TEXT NULL,
  bride_address TEXT NOT NULL,
  bride_age INTEGER NOT NULL,
  bride_madhab TEXT NULL,
  wali_name TEXT NOT NULL,
  wali_name_en TEXT NULL,
  wali_father_name TEXT NOT NULL,
  mahr TEXT NOT NULL,
  mahr_en TEXT NULL,
  witness1_name TEXT NOT NULL,
  witness1_name_en TEXT NULL,
  witness1_father_name TEXT NOT NULL,
  witness1_father_name_en TEXT NULL,
  witness2_name TEXT NOT NULL,
  witness2_name_en TEXT NULL,
  witness2_father_name TEXT NOT NULL,
  witness2_father_name_en TEXT NULL,
  kathib_thaib_name TEXT NULL,
  kathib_name_en TEXT NULL,
  kathib_thaib_father_name TEXT NULL,
  registrar_name TEXT NOT NULL,
  registrar_father_name TEXT NOT NULL,
  register_page_number TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outside_marriage_registers ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin + superadmin)
CREATE POLICY "Admins can view outside marriage registers"
ON public.outside_marriage_registers FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can insert outside marriage registers"
ON public.outside_marriage_registers FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can update outside marriage registers"
ON public.outside_marriage_registers FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can delete outside marriage registers"
ON public.outside_marriage_registers FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Updated_at trigger
CREATE TRIGGER update_outside_marriage_registers_updated_at
BEFORE UPDATE ON public.outside_marriage_registers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Income tracking trigger for outside marriage certificate payments
CREATE OR REPLACE FUNCTION public.record_outside_marriage_certificate_payment_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Update the existing record_certificate_payment_income function to also handle outside_marriage
CREATE OR REPLACE FUNCTION public.record_certificate_payment_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Insert default app settings for outside marriage
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('certificate_fee_outside_marriage', '100', 'Fee for outside marriage certificate'),
  ('outside_marriage_certificate_number_format', 'OMAR/YYYY/NNN', 'Format for outside marriage certificate numbers'),
  ('outside_marriage_certificate_sequence', '1', 'Current sequence number for outside marriage certificates')
ON CONFLICT DO NOTHING;
