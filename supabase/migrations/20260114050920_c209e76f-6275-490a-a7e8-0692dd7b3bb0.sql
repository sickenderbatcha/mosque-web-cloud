-- Create trigger function to notify admin of new NOC certificate request
CREATE OR REPLACE FUNCTION public.notify_admin_new_noc_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id, reference_type)
  VALUES (
    'new_noc_request',
    'புதிய NOC கோரிக்கை (New NOC Request)',
    'புதிய NOC சான்றிதழ் கோரிக்கை ' || NEW.applicant_name || ' (' || NEW.father_name || ' மகன்/மகள்) அவர்களிடமிருந்து பெறப்பட்டுள்ளது.',
    NEW.id,
    'noc_certificates'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to call the function on new NOC certificate insert
CREATE TRIGGER notify_admin_on_noc_insert
AFTER INSERT ON public.noc_certificates
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_noc_request();