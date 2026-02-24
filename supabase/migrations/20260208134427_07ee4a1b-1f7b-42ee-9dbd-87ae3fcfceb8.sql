
-- 1. Create the issued_documents table
CREATE TABLE public.issued_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number TEXT UNIQUE,
  document_category TEXT NOT NULL DEFAULT 'certificate',
  document_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  member_id TEXT,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  beneficiary_name TEXT,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID,
  amount NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reference_id, document_type)
);

-- Enable RLS
ALTER TABLE public.issued_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Admin/Superadmin full access
CREATE POLICY "Admins can manage issued documents"
ON public.issued_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Indexes for search performance
CREATE INDEX idx_issued_documents_type ON public.issued_documents(document_type);
CREATE INDEX idx_issued_documents_category ON public.issued_documents(document_category);
CREATE INDEX idx_issued_documents_member_id ON public.issued_documents(member_id);
CREATE INDEX idx_issued_documents_issued_date ON public.issued_documents(issued_date);
CREATE INDEX idx_issued_documents_document_number ON public.issued_documents(document_number);

-- 2. Document number auto-generation function
CREATE OR REPLACE FUNCTION public.generate_document_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  doc_year INTEGER;
  seq_num INTEGER;
BEGIN
  IF NEW.document_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  doc_year := EXTRACT(YEAR FROM COALESCE(NEW.issued_date, CURRENT_DATE));

  prefix := CASE NEW.document_type
    WHEN 'death' THEN 'DC'
    WHEN 'marriage' THEN 'MC'
    WHEN 'outside_marriage' THEN 'OMC'
    WHEN 'noc' THEN 'NOC'
    WHEN 'heir' THEN 'HC'
    WHEN 'mahal_booking' THEN 'MBR'
    ELSE 'DOC'
  END;

  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(document_number FROM LENGTH(prefix || '-' || doc_year::text || '-') + 1), '') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.issued_documents
  WHERE document_type = NEW.document_type
    AND document_number LIKE prefix || '-' || doc_year::text || '-%';

  NEW.document_number := prefix || '-' || doc_year::text || '-' || LPAD(seq_num::text, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_document_number_trigger
BEFORE INSERT ON public.issued_documents
FOR EACH ROW
EXECUTE FUNCTION public.generate_document_number();

-- 3. Updated_at trigger
CREATE TRIGGER update_issued_documents_updated_at
BEFORE UPDATE ON public.issued_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Auto-issue triggers for each source table

-- Death registers (on INSERT)
CREATE OR REPLACE FUNCTION public.auto_issue_death_document()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.issued_documents (
    document_category, document_type, reference_id, member_id,
    applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by
  ) VALUES (
    'certificate', 'death', NEW.id, NEW.member_id,
    NEW.informant_name, NEW.informant_phone, NEW.deceased_name,
    NEW.death_date::date, NEW.created_by
  )
  ON CONFLICT (reference_id, document_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_death_document_trigger
AFTER INSERT ON public.death_registers
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_death_document();

-- Marriage registers (on INSERT)
CREATE OR REPLACE FUNCTION public.auto_issue_marriage_document()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.issued_documents (
    document_category, document_type, reference_id, member_id,
    applicant_name, beneficiary_name, issued_date, issued_by
  ) VALUES (
    'certificate', 'marriage', NEW.id, NEW.member_id,
    NEW.groom_name, NEW.groom_name || ' & ' || NEW.bride_name,
    CURRENT_DATE, NEW.created_by
  )
  ON CONFLICT (reference_id, document_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_marriage_document_trigger
AFTER INSERT ON public.marriage_registers
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_marriage_document();

-- Outside marriage registers (on INSERT)
CREATE OR REPLACE FUNCTION public.auto_issue_outside_marriage_document()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.issued_documents (
    document_category, document_type, reference_id, member_id,
    applicant_name, beneficiary_name, issued_date, issued_by
  ) VALUES (
    'certificate', 'outside_marriage', NEW.id, NEW.member_id,
    NEW.groom_name, NEW.groom_name || ' & ' || NEW.bride_name,
    CURRENT_DATE,
    CASE WHEN NEW.created_by IS NOT NULL AND NEW.created_by ~ '^[0-9a-f]{8}-' THEN NEW.created_by::uuid ELSE NULL END
  )
  ON CONFLICT (reference_id, document_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_outside_marriage_document_trigger
AFTER INSERT ON public.outside_marriage_registers
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_outside_marriage_document();

-- NOC certificates (on approval)
CREATE OR REPLACE FUNCTION public.auto_issue_noc_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by
    ) VALUES (
      'certificate', 'noc', NEW.id, NEW.applicant_membership_number,
      NEW.applicant_name, NEW.applicant_phone, NEW.applicant_name,
      CURRENT_DATE, NEW.approved_by
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_noc_document_trigger
AFTER INSERT OR UPDATE ON public.noc_certificates
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_noc_document();

-- Heir certificates (on approval)
CREATE OR REPLACE FUNCTION public.auto_issue_heir_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by
    ) VALUES (
      'certificate', 'heir', NEW.id, NEW.deceased_member_id,
      NEW.applicant_name, NEW.applicant_phone, NEW.deceased_name,
      CURRENT_DATE, NEW.approved_by
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_heir_document_trigger
AFTER INSERT OR UPDATE ON public.heir_certificates
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_heir_document();

-- Mahal bookings receipt (on approval with payment)
CREATE OR REPLACE FUNCTION public.auto_issue_booking_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.payment_status IN ('paid', 'completed') THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id,
      applicant_name, applicant_phone, beneficiary_name,
      amount, issued_date, metadata
    ) VALUES (
      'receipt', 'mahal_booking', NEW.id,
      NEW.applicant_name, NEW.applicant_phone, NEW.applicant_name,
      NEW.booking_amount, CURRENT_DATE,
      jsonb_build_object('event_type', NEW.event_type, 'event_date', NEW.event_date::text)
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_booking_receipt_trigger
AFTER INSERT OR UPDATE ON public.mahal_bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_booking_receipt();

-- 5. Backfill existing data

-- Death registers
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by)
SELECT 'certificate', 'death', id, member_id, informant_name, informant_phone, deceased_name, death_date::date, created_by
FROM public.death_registers
ON CONFLICT (reference_id, document_type) DO NOTHING;

-- Marriage registers
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, beneficiary_name, issued_date, issued_by)
SELECT 'certificate', 'marriage', id, member_id, groom_name, groom_name || ' & ' || bride_name, created_at::date, created_by
FROM public.marriage_registers
ON CONFLICT (reference_id, document_type) DO NOTHING;

-- Outside marriage registers
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, beneficiary_name, issued_date, issued_by)
SELECT 'certificate', 'outside_marriage', id, member_id, groom_name, groom_name || ' & ' || bride_name, created_at::date,
  CASE WHEN created_by IS NOT NULL AND created_by ~ '^[0-9a-f]{8}-' THEN created_by::uuid ELSE NULL END
FROM public.outside_marriage_registers
ON CONFLICT (reference_id, document_type) DO NOTHING;

-- NOC certificates (approved only)
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by)
SELECT 'certificate', 'noc', id, applicant_membership_number, applicant_name, applicant_phone, applicant_name, COALESCE(approved_at::date, created_at::date), approved_by
FROM public.noc_certificates
WHERE status = 'approved'
ON CONFLICT (reference_id, document_type) DO NOTHING;

-- Heir certificates (approved only)
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, applicant_phone, beneficiary_name, issued_date, issued_by)
SELECT 'certificate', 'heir', id, deceased_member_id, applicant_name, applicant_phone, deceased_name, COALESCE(approved_at::date, created_at::date), approved_by
FROM public.heir_certificates
WHERE status = 'approved'
ON CONFLICT (reference_id, document_type) DO NOTHING;

-- Mahal bookings (approved with payment)
INSERT INTO public.issued_documents (document_category, document_type, reference_id, applicant_name, applicant_phone, beneficiary_name, amount, issued_date, metadata)
SELECT 'receipt', 'mahal_booking', id, applicant_name, applicant_phone, applicant_name, booking_amount, COALESCE(updated_at::date, created_at::date),
  jsonb_build_object('event_type', event_type, 'event_date', event_date::text)
FROM public.mahal_bookings
WHERE status = 'approved' AND payment_status IN ('paid', 'completed')
ON CONFLICT (reference_id, document_type) DO NOTHING;
