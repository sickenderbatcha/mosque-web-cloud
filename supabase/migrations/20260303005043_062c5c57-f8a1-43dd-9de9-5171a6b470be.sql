-- Add admin payment fields to refund_requests
ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS refund_payment_type text,
  ADD COLUMN IF NOT EXISTS refund_reference_number text,
  ADD COLUMN IF NOT EXISTS refund_additional_info text;