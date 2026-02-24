-- Create a trigger to notify admin when new refund request is created
CREATE OR REPLACE FUNCTION public.notify_admin_new_refund_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id, reference_type)
  VALUES (
    'new_refund_request',
    'புதிய பணத்திரும்ப கோரிக்கை (New Refund Request)',
    'புதிய பணத்திரும்ப கோரிக்கை ₹' || NEW.amount || ' தொகைக்கு பெறப்பட்டுள்ளது.',
    NEW.id,
    'refund_requests'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new refund requests
DROP TRIGGER IF EXISTS trigger_notify_admin_refund ON public.refund_requests;
CREATE TRIGGER trigger_notify_admin_refund
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_refund_request();