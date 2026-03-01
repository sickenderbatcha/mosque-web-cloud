
-- Fix INSERT trigger: also handle 'paid' status
CREATE OR REPLACE FUNCTION public.add_subscription_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'completed' OR NEW.payment_status = 'paid' THEN
    INSERT INTO public.income (
      amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
    ) VALUES (
      NEW.total_amount,
      'சந்தா (Subscription)',
      NEW.member_name || ' (' || NEW.member_id || ')',
      NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
      CURRENT_DATE,
      COALESCE(NEW.payment_method, 'Online'),
      NEW.transaction_id,
      NEW.id,
      'subscription'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix UPDATE trigger: also handle 'paid' status
CREATE OR REPLACE FUNCTION public.add_subscription_to_income_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.payment_status = 'completed' OR NEW.payment_status = 'paid') 
     AND (OLD.payment_status IS NULL OR (OLD.payment_status != 'completed' AND OLD.payment_status != 'paid')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.income WHERE reference_id = NEW.id AND reference_type = 'subscription') THEN
      INSERT INTO public.income (
        amount, category, source, description, income_date, payment_method, receipt_number, reference_id, reference_type
      ) VALUES (
        NEW.total_amount,
        'சந்தா (Subscription)',
        NEW.member_name || ' (' || NEW.member_id || ')',
        NEW.subscription_type || ' - ' || COALESCE(NEW.from_month::text, '') || '/' || COALESCE(NEW.from_year::text, '') || ' to ' || COALESCE(NEW.to_month::text, '') || '/' || COALESCE(NEW.to_year::text, ''),
        CURRENT_DATE,
        COALESCE(NEW.payment_method, 'Online'),
        NEW.transaction_id,
        NEW.id,
        'subscription'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
