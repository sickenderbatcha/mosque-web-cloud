-- Update the trigger function to use the new Tamil term for death certificate
CREATE OR REPLACE FUNCTION public.record_certificate_payment_income()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
BEGIN
  -- Only record income when payment status becomes 'completed'
  IF NEW.payment_status = 'completed' THEN
    -- Check if income entry already exists for this certificate payment
    IF NOT EXISTS (
      SELECT 1 FROM public.income 
      WHERE reference_type = 'certificate_payment' 
      AND reference_id = NEW.id
    ) THEN
      -- Determine category based on certificate type
      category_name := CASE NEW.certificate_type
        WHEN 'marriage' THEN 'திருமண சான்றிதழ் (Marriage Certificate)'
        WHEN 'death' THEN 'இறப்புச் சான்றிதழ் (Death Certificate)'
        WHEN 'bonafide' THEN 'போனாஃபைட் சான்றிதழ் (Bonafide Certificate)'
        WHEN 'noc' THEN 'ஆட்சேபனையின்மை சான்றிதழ் (NOC)'
        ELSE 'சான்றிதழ் கட்டணம் (Certificate Fee)'
      END;

      -- Insert income record
      INSERT INTO public.income (
        amount,
        category,
        source,
        description,
        payment_method,
        income_date,
        reference_type,
        reference_id
      ) VALUES (
        NEW.amount,
        category_name,
        NEW.applicant_name,
        'சான்றிதழ் கட்டணம் - ' || NEW.reference_id,
        COALESCE(NEW.payment_method, 'online'),
        CURRENT_DATE,
        'certificate_payment',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;