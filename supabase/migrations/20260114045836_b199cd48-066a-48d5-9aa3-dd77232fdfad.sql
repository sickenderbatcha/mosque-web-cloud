-- Create NOC certificates table
CREATE TABLE public.noc_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_membership_number TEXT,
  applicant_name TEXT NOT NULL,
  father_membership_number TEXT NOT NULL,
  father_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  applicant_relationship TEXT NOT NULL CHECK (applicant_relationship IN ('மகன்', 'மகள்')),
  partner_name TEXT NOT NULL,
  partner_father_name TEXT NOT NULL,
  partner_category TEXT NOT NULL CHECK (partner_category IN ('மணமகனுக்கும்', 'மணமகளுக்கும்')),
  mosque_to_submit TEXT NOT NULL,
  address_to_submit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_pending', 'submitted', 'approved', 'rejected')),
  payment_status TEXT DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noc_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create NOC requests"
ON public.noc_certificates
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own NOC requests"
ON public.noc_certificates
FOR SELECT
USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all NOC requests"
ON public.noc_certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own pending NOC requests"
ON public.noc_certificates
FOR UPDATE
USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id AND status IN ('pending', 'payment_pending')) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_noc_certificates_updated_at
BEFORE UPDATE ON public.noc_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();