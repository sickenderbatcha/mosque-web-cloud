
-- Create a callable helper to generate document numbers
CREATE OR REPLACE FUNCTION public.generate_document_number_for_type(p_document_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  doc_year INTEGER;
  seq_num INTEGER;
BEGIN
  doc_year := EXTRACT(YEAR FROM CURRENT_DATE);

  prefix := CASE p_document_type
    WHEN 'death' THEN 'DC'
    WHEN 'marriage' THEN 'MC'
    WHEN 'outside_marriage' THEN 'OMC'
    WHEN 'noc' THEN 'NOC'
    WHEN 'heir' THEN 'HC'
    WHEN 'mahal_booking' THEN 'MBR'
    WHEN 'donation' THEN 'DNR'
    WHEN 'subscription' THEN 'SUB'
    WHEN 'cash_payment' THEN 'CPR'
    WHEN 'certificate_payment' THEN 'CTP'
    ELSE 'DOC'
  END;

  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(document_number FROM LENGTH(prefix || '-' || doc_year::text || '-') + 1), '') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.issued_documents
  WHERE document_type = p_document_type
    AND document_number LIKE prefix || '-' || doc_year::text || '-%';

  RETURN prefix || '-' || doc_year::text || '-' || LPAD(seq_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update the existing trigger function to handle new types
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
    WHEN 'donation' THEN 'DNR'
    WHEN 'subscription' THEN 'SUB'
    WHEN 'cash_payment' THEN 'CPR'
    WHEN 'certificate_payment' THEN 'CTP'
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

-- 1) DONATIONS trigger
CREATE OR REPLACE FUNCTION public.auto_issue_donation_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name,
      issued_date, amount
    ) VALUES (
      'receipt', 'donation', NEW.id, NULL,
      NEW.donor_name, NEW.donor_phone, NEW.donor_name,
      COALESCE(NEW.donated_at, NEW.created_at)::date, NEW.amount
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_donation_receipt_trigger
AFTER INSERT OR UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_donation_receipt();

-- 2) SUBSCRIPTIONS trigger
CREATE OR REPLACE FUNCTION public.auto_issue_subscription_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status IN ('completed', 'paid') THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name,
      issued_date, amount
    ) VALUES (
      'receipt', 'subscription', NEW.id, NEW.member_id,
      NEW.member_name, NEW.member_phone, NEW.member_name,
      NEW.created_at::date, NEW.total_amount
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_subscription_receipt_trigger
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_subscription_receipt();

-- 3) CASH PAYMENT REQUESTS trigger
CREATE OR REPLACE FUNCTION public.auto_issue_cash_payment_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name,
      issued_date, amount
    ) VALUES (
      'receipt', 'cash_payment', NEW.id, NULL,
      NEW.applicant_name, NEW.applicant_phone, NEW.applicant_name,
      COALESCE(NEW.processed_at, NEW.updated_at)::date, NEW.amount
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_cash_payment_receipt_trigger
AFTER INSERT OR UPDATE ON public.cash_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_cash_payment_receipt();

-- 4) CERTIFICATE PAYMENTS trigger
CREATE OR REPLACE FUNCTION public.auto_issue_certificate_payment_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    INSERT INTO public.issued_documents (
      document_category, document_type, reference_id, member_id,
      applicant_name, applicant_phone, beneficiary_name,
      issued_date, amount
    ) VALUES (
      'receipt', 'certificate_payment', NEW.id, NULL,
      NEW.applicant_name, NEW.applicant_phone, NEW.applicant_name,
      NEW.created_at::date, NEW.amount
    )
    ON CONFLICT (reference_id, document_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_issue_certificate_payment_receipt_trigger
AFTER INSERT OR UPDATE ON public.certificate_payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_issue_certificate_payment_receipt();

-- ============================================================
-- BACKFILL existing records (document_number auto-generated by trigger)
-- ============================================================

-- Backfill donations
INSERT INTO public.issued_documents (document_category, document_type, reference_id, applicant_name, applicant_phone, beneficiary_name, issued_date, amount)
SELECT 'receipt', 'donation', d.id, d.donor_name, d.donor_phone, d.donor_name,
       COALESCE(d.donated_at, d.created_at)::date, d.amount
FROM public.donations d
WHERE d.payment_status = 'completed'
AND NOT EXISTS (SELECT 1 FROM public.issued_documents WHERE reference_id = d.id AND document_type = 'donation');

-- Backfill subscriptions
INSERT INTO public.issued_documents (document_category, document_type, reference_id, member_id, applicant_name, applicant_phone, beneficiary_name, issued_date, amount)
SELECT 'receipt', 'subscription', s.id, s.member_id, s.member_name, s.member_phone, s.member_name,
       s.created_at::date, s.total_amount
FROM public.subscriptions s
WHERE s.payment_status IN ('completed', 'paid')
AND NOT EXISTS (SELECT 1 FROM public.issued_documents WHERE reference_id = s.id AND document_type = 'subscription');

-- Backfill cash payment requests
INSERT INTO public.issued_documents (document_category, document_type, reference_id, applicant_name, applicant_phone, beneficiary_name, issued_date, amount)
SELECT 'receipt', 'cash_payment', c.id, c.applicant_name, c.applicant_phone, c.applicant_name,
       COALESCE(c.processed_at, c.updated_at)::date, c.amount
FROM public.cash_payment_requests c
WHERE c.status = 'paid'
AND NOT EXISTS (SELECT 1 FROM public.issued_documents WHERE reference_id = c.id AND document_type = 'cash_payment');

-- Backfill certificate payments
INSERT INTO public.issued_documents (document_category, document_type, reference_id, applicant_name, applicant_phone, beneficiary_name, issued_date, amount)
SELECT 'receipt', 'certificate_payment', cp.id, cp.applicant_name, cp.applicant_phone, cp.applicant_name,
       cp.created_at::date, cp.amount
FROM public.certificate_payments cp
WHERE cp.payment_status = 'completed'
AND NOT EXISTS (SELECT 1 FROM public.issued_documents WHERE reference_id = cp.id AND document_type = 'certificate_payment');
