-- Create certificate_payments table to track payments for marriage/death certificates
CREATE TABLE public.certificate_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('marriage', 'death', 'bonafide', 'noc')),
  reference_id UUID NOT NULL,
  user_id UUID,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT,
  amount NUMERIC NOT NULL DEFAULT 100,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'completed', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('online', 'cash')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  transaction_id TEXT,
  admin_notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all certificate payments" 
ON public.certificate_payments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create certificate payments" 
ON public.certificate_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own payments" 
ON public.certificate_payments 
FOR SELECT 
USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_certificate_payments_updated_at
BEFORE UPDATE ON public.certificate_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_certificate_payments_reference ON public.certificate_payments(certificate_type, reference_id);
CREATE INDEX idx_certificate_payments_status ON public.certificate_payments(payment_status);