-- Add subtitle_line2 to hero section content
INSERT INTO public.landing_page_content (section, content_key, content_value, language, display_order, is_active)
VALUES ('hero', 'subtitle_line2', 'அனைவரையும் அன்புடன் வரவேற்கிறோம்', 'ta', 5, true)
ON CONFLICT DO NOTHING;