CREATE OR REPLACE FUNCTION public.get_paid_subscription_months(_member_id text)
RETURNS TABLE(year integer, month integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _member_id IS NULL OR btrim(_member_id) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.year, s.month
  FROM public.subscription_slots s
  WHERE s.member_id = btrim(_member_id) AND s.is_paid = true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_paid_subscription_months(text) TO anon, authenticated, service_role;