-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check tokens (for reset process)
CREATE POLICY "Anyone can verify reset tokens"
ON public.password_reset_tokens
FOR SELECT
USING (true);

-- Allow anyone to create reset tokens
CREATE POLICY "Anyone can create reset tokens"
ON public.password_reset_tokens
FOR INSERT
WITH CHECK (true);

-- Allow updates (marking as used)
CREATE POLICY "Anyone can update reset tokens"
ON public.password_reset_tokens
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_member_id ON public.password_reset_tokens(member_id);