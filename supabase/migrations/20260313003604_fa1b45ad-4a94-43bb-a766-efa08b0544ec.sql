
CREATE TABLE public.rental_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  father_name text NOT NULL,
  address text NOT NULL,
  shop_premises text NULL,
  shop_number text NULL,
  shop_address text NULL,
  category text NOT NULL DEFAULT 'shop',
  rent_type text NOT NULL DEFAULT 'monthly',
  rent_amount numeric NOT NULL DEFAULT 0,
  advance_amount numeric NULL DEFAULT 0,
  agreement_start_date date NOT NULL,
  agreement_end_date date NULL,
  rent_increase_period text NULL,
  increase_percentage numeric NULL DEFAULT 0,
  agreement_status text NOT NULL DEFAULT 'active',
  status_change_date date NULL,
  rent_calculate_from text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rental agreements"
ON public.rental_agreements FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view rental agreements"
ON public.rental_agreements FOR SELECT TO public
USING (true);

CREATE TRIGGER update_rental_agreements_updated_at
BEFORE UPDATE ON public.rental_agreements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
