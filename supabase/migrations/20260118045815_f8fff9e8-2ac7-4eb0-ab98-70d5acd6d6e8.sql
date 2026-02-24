-- Create table to track page visits
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at);
CREATE INDEX idx_page_visits_visitor_id ON public.page_visits(visitor_id);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking)
CREATE POLICY "Anyone can insert page visits"
  ON public.page_visits
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read page visits
CREATE POLICY "Admins can read page visits"
  ON public.page_visits
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for aggregated visitor stats (public read)
CREATE VIEW public.visitor_stats AS
SELECT 
  (SELECT COUNT(DISTINCT visitor_id) FROM public.page_visits) AS total_visitors,
  (SELECT COUNT(DISTINCT visitor_id) FROM public.page_visits WHERE visited_at >= CURRENT_DATE) AS today_visitors;

-- Grant access to the view
GRANT SELECT ON public.visitor_stats TO anon, authenticated;

-- Enable realtime for live user tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;