-- Create cash payment requests table
CREATE TABLE public.cash_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL, -- 'booking', 'donation', 'certificate', 'subscription', 'noc', 'heir'
  reference_id UUID, -- Reference to the related record (optional, may not exist yet for donations)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT,
  failure_reason TEXT, -- Razorpay error message/code
  user_notes TEXT, -- User explanation
  service_details JSONB, -- Additional service-specific details
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own cash payment requests"
ON public.cash_payment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create cash payment requests"
ON public.cash_payment_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all cash payment requests"
ON public.cash_payment_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Admins can update requests
CREATE POLICY "Admins can update cash payment requests"
ON public.cash_payment_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Create trigger for updated_at
CREATE TRIGGER update_cash_payment_requests_updated_at
BEFORE UPDATE ON public.cash_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for new requests
CREATE OR REPLACE FUNCTION public.notify_admin_new_cash_payment_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id, reference_type)
  VALUES (
    'new_cash_payment_request',
    'புதிய ரொக்க செலுத்துதல் கோரிக்கை (New Cash Payment Request)',
    'புதிய ரொக்க செலுத்துதல் கோரிக்கை ' || NEW.applicant_name || ' அவர்களிடமிருந்து ' || NEW.service_type || ' சேவைக்கு ₹' || NEW.amount || ' தொகைக்கு பெறப்பட்டுள்ளது.',
    NEW.id,
    'cash_payment_requests'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admin_on_cash_payment_request
AFTER INSERT ON public.cash_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_cash_payment_request();