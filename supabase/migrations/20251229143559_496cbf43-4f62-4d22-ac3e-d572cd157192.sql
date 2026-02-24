-- Create subscriptions table to store all subscription details
CREATE TABLE public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_phone TEXT NOT NULL,
    member_address TEXT,
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'yearly')),
    amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    from_month INTEGER,
    from_year INTEGER,
    to_month INTEGER,
    to_year INTEGER,
    number_of_months INTEGER DEFAULT 1,
    subscription_year INTEGER,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view subscriptions by member_id" 
ON public.subscriptions 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();