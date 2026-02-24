-- Create heir_certificates table for வாரிசு சான்றிதழ்
CREATE TABLE public.heir_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Applicant details
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_email TEXT,
  applicant_relationship TEXT NOT NULL,
  
  -- Deceased member details
  deceased_member_id TEXT,
  deceased_name TEXT NOT NULL,
  deceased_father_name TEXT NOT NULL,
  deceased_address TEXT NOT NULL,
  
  -- Certificate info
  register_number TEXT,
  certificate_date DATE DEFAULT CURRENT_DATE,
  
  -- Heirs information (stored as JSONB array)
  heirs JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status & Payment
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  admin_notes TEXT,
  
  -- Tracking
  user_id UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.heir_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all heir certificates" 
ON public.heir_certificates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create heir certificate requests" 
ON public.heir_certificates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own heir certificate requests" 
ON public.heir_certificates 
FOR SELECT 
USING (
  ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update their own pending heir certificate requests" 
ON public.heir_certificates 
FOR UPDATE 
USING (
  ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id) AND (status IN ('pending', 'payment_pending'))) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_heir_certificates_updated_at
BEFORE UPDATE ON public.heir_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comment on table
COMMENT ON TABLE public.heir_certificates IS 'Stores heir certificate (வாரிசு சான்றிதழ்) requests and data';
COMMENT ON COLUMN public.heir_certificates.heirs IS 'Array of heir objects: [{name, relationship, age, marriage_eligibility}]';