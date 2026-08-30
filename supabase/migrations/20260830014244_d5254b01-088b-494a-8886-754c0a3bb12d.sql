ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS voucher_number text;

CREATE OR REPLACE FUNCTION public.handle_approved_refund_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  payment_method_text TEXT;
  expense_description TEXT;
  refund_prefix TEXT;
  voucher_num TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT applicant_name, event_type, event_date, applicant_phone
    INTO booking_record
    FROM public.mahal_bookings
    WHERE id = NEW.booking_id;

    IF NEW.upi_id IS NOT NULL THEN
      payment_method_text := 'UPI';
    ELSIF NEW.bank_account_number IS NOT NULL THEN
      payment_method_text := 'Bank Transfer';
    ELSE
      payment_method_text := 'Cash';
    END IF;

    voucher_num := NEW.voucher_number;
    IF voucher_num IS NULL THEN
      SELECT value INTO refund_prefix FROM public.app_settings WHERE key = 'receipt_num_prefix_refund';
      IF refund_prefix IS NULL OR refund_prefix = '' THEN
        refund_prefix := 'REF-';
      END IF;
      voucher_num := public.get_next_receipt_number('refund', refund_prefix);

      UPDATE public.refund_requests
      SET voucher_number = voucher_num
      WHERE id = NEW.id AND voucher_number IS NULL;
    END IF;

    expense_description := 'Refund for ' || COALESCE(booking_record.event_type, 'Booking') ||
      ' - ' || COALESCE(booking_record.applicant_name, 'N/A') ||
      ' (Phone: ' || COALESCE(booking_record.applicant_phone, 'N/A') || ')' ||
      CASE WHEN booking_record.event_date IS NOT NULL
        THEN ' | Event Date: ' || booking_record.event_date::text
        ELSE ''
      END ||
      CASE WHEN NEW.reason IS NOT NULL
        THEN ' | Reason: ' || NEW.reason
        ELSE ''
      END;

    IF NOT EXISTS (
      SELECT 1 FROM public.expenses
      WHERE category = 'Refund' AND receipt_number = voucher_num
    ) THEN
      INSERT INTO public.expenses (
        amount, category, expense_date, description, payment_method,
        vendor_name, approved_by, created_by, receipt_number
      ) VALUES (
        NEW.amount, 'Refund', CURRENT_DATE, expense_description, payment_method_text,
        COALESCE(booking_record.applicant_name, 'N/A'), NEW.processed_by, NEW.processed_by, voucher_num
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;