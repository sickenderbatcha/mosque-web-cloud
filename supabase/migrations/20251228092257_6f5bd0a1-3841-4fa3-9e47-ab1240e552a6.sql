-- Add notification preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sms boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.notification_email IS 'Whether user wants to receive email notifications';
COMMENT ON COLUMN public.profiles.notification_sms IS 'Whether user wants to receive SMS notifications';