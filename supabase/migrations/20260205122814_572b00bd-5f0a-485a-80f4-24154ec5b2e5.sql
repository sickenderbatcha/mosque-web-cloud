-- Create table for booking OTP verification tokens
CREATE TABLE public.booking_otp_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_booking_otp_tokens_phone ON public.booking_otp_tokens(phone);
CREATE INDEX idx_booking_otp_tokens_expires ON public.booking_otp_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.booking_otp_tokens ENABLE ROW LEVEL SECURITY;

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service role can manage OTP tokens" 
ON public.booking_otp_tokens 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create cleanup function to delete expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.booking_otp_tokens WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;