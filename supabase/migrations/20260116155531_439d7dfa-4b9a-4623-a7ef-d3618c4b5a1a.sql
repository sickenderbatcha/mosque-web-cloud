-- Create subscription_slots table for tracking individual month payments
CREATE TABLE public.subscription_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint to prevent duplicate payments for same month/year
  CONSTRAINT unique_member_year_month UNIQUE (member_id, year, month)
);

-- Enable RLS
ALTER TABLE public.subscription_slots ENABLE ROW LEVEL SECURITY;

-- Admins can manage all subscription slots
CREATE POLICY "Admins can manage subscription slots"
  ON public.subscription_slots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view subscription slots (for member lookup)
CREATE POLICY "Anyone can view subscription slots"
  ON public.subscription_slots
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_subscription_slots_member_year ON public.subscription_slots(member_id, year);
CREATE INDEX idx_subscription_slots_year_month ON public.subscription_slots(year, month);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_slots_updated_at
  BEFORE UPDATE ON public.subscription_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();