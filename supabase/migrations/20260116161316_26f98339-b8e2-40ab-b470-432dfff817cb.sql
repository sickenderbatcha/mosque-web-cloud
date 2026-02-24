-- Create a function to populate subscription_slots when a subscription is paid
CREATE OR REPLACE FUNCTION public.populate_subscription_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month_iter INTEGER;
  current_year_iter INTEGER;
  months_to_process INTEGER;
  monthly_amount NUMERIC;
BEGIN
  -- Only process when payment status changes to completed or paid
  IF (NEW.payment_status = 'completed' OR NEW.payment_status = 'paid') 
     AND (OLD.payment_status IS NULL OR (OLD.payment_status != 'completed' AND OLD.payment_status != 'paid')) THEN
    
    IF NEW.subscription_type = 'yearly' THEN
      -- For yearly subscriptions, fill all 12 months
      monthly_amount := COALESCE(NEW.total_amount / 12, NEW.amount / 12, 0);
      
      FOR month_num IN 1..12 LOOP
        INSERT INTO public.subscription_slots (
          member_id,
          year,
          month,
          is_paid,
          payment_date,
          amount,
          payment_method,
          transaction_id,
          notes
        ) VALUES (
          NEW.member_id,
          COALESCE(NEW.subscription_year, EXTRACT(YEAR FROM NOW())::INTEGER),
          month_num,
          true,
          CURRENT_DATE,
          monthly_amount,
          COALESCE(NEW.payment_method, 'Online'),
          NEW.transaction_id,
          'Auto-generated from yearly subscription ' || NEW.id
        )
        ON CONFLICT (member_id, year, month) 
        DO UPDATE SET
          is_paid = true,
          payment_date = CURRENT_DATE,
          amount = monthly_amount,
          payment_method = COALESCE(NEW.payment_method, 'Online'),
          transaction_id = NEW.transaction_id,
          notes = 'Updated from yearly subscription ' || NEW.id,
          updated_at = NOW();
      END LOOP;
      
    ELSIF NEW.subscription_type = 'monthly' AND NEW.from_month IS NOT NULL AND NEW.from_year IS NOT NULL THEN
      -- For monthly subscriptions, fill from from_month/from_year for number_of_months
      current_month_iter := NEW.from_month;
      current_year_iter := NEW.from_year;
      months_to_process := COALESCE(NEW.number_of_months, 1);
      monthly_amount := COALESCE(NEW.amount, 100);
      
      FOR i IN 1..months_to_process LOOP
        INSERT INTO public.subscription_slots (
          member_id,
          year,
          month,
          is_paid,
          payment_date,
          amount,
          payment_method,
          transaction_id,
          notes
        ) VALUES (
          NEW.member_id,
          current_year_iter,
          current_month_iter,
          true,
          CURRENT_DATE,
          monthly_amount,
          COALESCE(NEW.payment_method, 'Online'),
          NEW.transaction_id,
          'Auto-generated from monthly subscription ' || NEW.id
        )
        ON CONFLICT (member_id, year, month) 
        DO UPDATE SET
          is_paid = true,
          payment_date = CURRENT_DATE,
          amount = monthly_amount,
          payment_method = COALESCE(NEW.payment_method, 'Online'),
          transaction_id = NEW.transaction_id,
          notes = 'Updated from monthly subscription ' || NEW.id,
          updated_at = NOW();
        
        -- Move to next month
        current_month_iter := current_month_iter + 1;
        IF current_month_iter > 12 THEN
          current_month_iter := 1;
          current_year_iter := current_year_iter + 1;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT (handles cash payments with status = 'completed')
CREATE TRIGGER populate_subscription_slots_on_insert
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed' OR NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.populate_subscription_slots();

-- Create trigger for UPDATE (handles online payments that get verified)
CREATE TRIGGER populate_subscription_slots_on_update
  AFTER UPDATE OF payment_status ON public.subscriptions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed' OR NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.populate_subscription_slots();