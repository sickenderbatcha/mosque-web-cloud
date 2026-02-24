-- Fix the view to use security invoker
DROP VIEW IF EXISTS public.visitor_stats;

CREATE VIEW public.visitor_stats
WITH (security_invoker = on) AS
SELECT 
  (SELECT COUNT(DISTINCT visitor_id) FROM public.page_visits) AS total_visitors,
  (SELECT COUNT(DISTINCT visitor_id) FROM public.page_visits WHERE visited_at >= CURRENT_DATE) AS today_visitors;

-- Grant access to the view
GRANT SELECT ON public.visitor_stats TO anon, authenticated;