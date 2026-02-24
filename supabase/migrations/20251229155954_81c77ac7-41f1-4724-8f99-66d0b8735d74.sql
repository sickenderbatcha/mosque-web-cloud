-- Create pending_users table for registration approval workflow
CREATE TABLE public.pending_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pending_users
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for pending_users
CREATE POLICY "Admins can manage pending users"
ON public.pending_users
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create pending user registration"
ON public.pending_users
FOR INSERT
WITH CHECK (true);

-- Policies for admin_notifications
CREATE POLICY "Admins can manage notifications"
ON public.admin_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add is_approved column to gb_members to link approved users
ALTER TABLE public.gb_members ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create function to create notification when new pending user is added
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id, reference_type)
  VALUES (
    'new_user_registration',
    'New User Registration',
    'New user ' || NEW.full_name || ' (Member ID: ' || NEW.member_id || ') has requested account approval.',
    NEW.id,
    'pending_users'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new pending user notification
CREATE TRIGGER on_new_pending_user
  AFTER INSERT ON public.pending_users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();