
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_receipt_type text, p_prefix text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer;
  v_next_number integer;
  v_prefix text;
  v_format text;
  v_result text;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;

  -- Get configured prefix from app_settings if not provided
  IF p_prefix IS NULL THEN
    SELECT COALESCE(value, '') INTO v_prefix
    FROM public.app_settings
    WHERE key = CASE p_receipt_type
      WHEN 'booking' THEN 'receipt_num_prefix_booking'
      WHEN 'donation' THEN 'receipt_num_prefix_donation'
      WHEN 'subscription' THEN 'receipt_num_prefix_subscription'
      WHEN 'cash_payment' THEN 'receipt_num_prefix_cash_payment'
      WHEN 'certificate_noc' THEN 'receipt_num_prefix_cert_noc'
      WHEN 'certificate_heir' THEN 'receipt_num_prefix_cert_heir'
      WHEN 'certificate_general' THEN 'receipt_num_prefix_cert_general'
      ELSE NULL
    END;
    
    -- Fallback defaults
    IF v_prefix IS NULL THEN
      v_prefix := CASE p_receipt_type
        WHEN 'booking' THEN 'BK-'
        WHEN 'donation' THEN 'DON-'
        WHEN 'subscription' THEN 'SUB-'
        WHEN 'cash_payment' THEN 'CASH-'
        WHEN 'certificate_noc' THEN 'NOC-'
        WHEN 'certificate_heir' THEN 'HEIR-'
        WHEN 'certificate_general' THEN 'CERT-'
        ELSE 'REC-'
      END;
    END IF;
  ELSE
    v_prefix := p_prefix;
  END IF;

  -- Get configured format pattern from app_settings
  SELECT value INTO v_format
  FROM public.app_settings
  WHERE key = 'receipt_num_format_' || p_receipt_type;

  -- Atomically increment with upsert and row lock
  INSERT INTO public.receipt_sequences (receipt_type, year, last_number)
  VALUES (p_receipt_type, v_year, 1)
  ON CONFLICT (receipt_type, year)
  DO UPDATE SET
    last_number = public.receipt_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;

  -- If custom format exists, use it; otherwise use default format
  IF v_format IS NOT NULL AND v_format != '' THEN
    v_result := v_format;
    
    -- Replace YYYY with full year
    v_result := REPLACE(v_result, 'YYYY', v_year::text);
    -- Replace YY with 2-digit year
    v_result := REPLACE(v_result, 'YY', RIGHT(v_year::text, 2));
    
    -- Find N+ pattern and replace with padded sequence
    -- Handle NNNN, NNN, NN, N patterns
    IF v_result LIKE '%NNNN%' THEN
      v_result := REPLACE(v_result, 'NNNN', LPAD(v_next_number::text, 4, '0'));
    ELSIF v_result LIKE '%NNN%' THEN
      v_result := REPLACE(v_result, 'NNN', LPAD(v_next_number::text, 3, '0'));
    ELSIF v_result LIKE '%NN%' THEN
      v_result := REPLACE(v_result, 'NN', LPAD(v_next_number::text, 2, '0'));
    ELSIF v_result LIKE '%N%' THEN
      v_result := REPLACE(v_result, 'N', v_next_number::text);
    ELSE
      -- No sequence placeholder found, append sequence
      v_result := v_result || LPAD(v_next_number::text, 4, '0');
    END IF;
    
    RETURN v_result;
  ELSE
    -- Default format: PREFIX + YEAR + '-' + PADDED_NUMBER e.g. BK-2026-0001
    RETURN v_prefix || v_year::text || '-' || LPAD(v_next_number::text, 4, '0');
  END IF;
END;
$function$;
