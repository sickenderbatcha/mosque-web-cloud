-- Create enum for relationship types
CREATE TYPE public.family_relationship AS ENUM ('Spouse', 'Child', 'Parent', 'Sibling');

-- Create enum for marital status
CREATE TYPE public.marital_status AS ENUM ('Single', 'Married', 'Divorced', 'Widowed');

-- Create gb_family_members table
CREATE TABLE public.gb_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.gb_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship family_relationship NOT NULL,
  marital_status marital_status,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  address TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gb_family_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage family members"
ON public.gb_family_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view family members"
ON public.gb_family_members
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_gb_family_members_updated_at
BEFORE UPDATE ON public.gb_family_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_gb_family_members_member_id ON public.gb_family_members(member_id);