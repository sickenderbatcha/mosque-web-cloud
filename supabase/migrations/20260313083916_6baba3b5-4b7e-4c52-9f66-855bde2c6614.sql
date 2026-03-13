
CREATE TABLE public.rental_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.rental_agreements(id) ON DELETE CASCADE,
  payment_month INTEGER NOT NULL CHECK (payment_month BETWEEN 1 AND 12),
  payment_year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Cash',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agreement_id, payment_month, payment_year)
);

ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rental payments"
ON public.rental_payments
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
