
-- Drop all receipt-related triggers
DROP TRIGGER IF EXISTS auto_issue_booking_receipt_trigger ON public.mahal_bookings;
DROP TRIGGER IF EXISTS auto_issue_donation_receipt_trigger ON public.donations;
DROP TRIGGER IF EXISTS auto_issue_subscription_receipt_trigger ON public.subscriptions;
DROP TRIGGER IF EXISTS auto_issue_cash_payment_receipt_trigger ON public.cash_payment_requests;
DROP TRIGGER IF EXISTS auto_issue_certificate_payment_receipt_trigger ON public.certificate_payments;

-- Drop all receipt-related functions
DROP FUNCTION IF EXISTS public.auto_issue_booking_receipt();
DROP FUNCTION IF EXISTS public.auto_issue_donation_receipt();
DROP FUNCTION IF EXISTS public.auto_issue_subscription_receipt();
DROP FUNCTION IF EXISTS public.auto_issue_cash_payment_receipt();
DROP FUNCTION IF EXISTS public.auto_issue_certificate_payment_receipt();

-- Delete all receipt records from issued_documents
DELETE FROM public.issued_documents WHERE document_category = 'receipt';

-- Update the generate_document_number function to only handle certificates
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

-- Update the generate_document_number_for_type function too
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
