
-- Create trigger function to auto-insert expense when refund is approved
CREATE OR REPLACE FUNCTION public.handle_approved_refund_expense()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  payment_method_text TEXT;
  expense_description TEXT;
BEGIN
  -- Only proceed when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Fetch booking details
    SELECT applicant_name, event_type, event_date, applicant_phone
    INTO booking_record
    FROM public.mahal_bookings
    WHERE id = NEW.booking_id;

    -- Determine payment method from refund details
    IF NEW.upi_id IS NOT NULL THEN
      payment_method_text := 'UPI';
    ELSIF NEW.bank_account_number IS NOT NULL THEN
      payment_method_text := 'Bank Transfer';
    ELSE
      payment_method_text := 'Cash';
    END IF;

    -- Build description
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

    -- Insert into expenses
    INSERT INTO public.expenses (
      amount,
      category,
      expense_date,
      description,
      payment_method,
      vendor_name,
      approved_by,
      created_by,
      receipt_number
    ) VALUES (
      NEW.amount,
      'Refund',
      CURRENT_DATE,
      expense_description,
      payment_method_text,
      COALESCE(booking_record.applicant_name, 'N/A'),
      NEW.processed_by,
      NEW.processed_by,
      'REF-' || LEFT(NEW.id::text, 8)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on refund_requests table
CREATE TRIGGER on_refund_approved_create_expense
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approved_refund_expense();
