-- Enable realtime for app_settings and landing_page_content
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_content;