-- Add payment tracking columns to donations table
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS donor_address TEXT;