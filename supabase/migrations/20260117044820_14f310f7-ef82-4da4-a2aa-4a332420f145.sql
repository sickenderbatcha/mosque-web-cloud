-- Create landing_page_content table for CMS
CREATE TABLE public.landing_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  content_key TEXT NOT NULL,
  content_value TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  language TEXT NOT NULL DEFAULT 'ta',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section, content_key, language)
);

-- Enable RLS
ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view active landing page content"
ON public.landing_page_content
FOR SELECT
USING (is_active = true);

-- Admin can manage content
CREATE POLICY "Admins can manage landing page content"
ON public.landing_page_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_landing_page_content_updated_at
BEFORE UPDATE ON public.landing_page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content for Hero Section
INSERT INTO public.landing_page_content (section, content_key, content_value, language, display_order) VALUES
('hero', 'greeting', 'அஸ்ஸலாமு அலைக்கும்', 'ta', 1),
('hero', 'title_line1', 'இளையான்குடி நெசவுப் பட்டடை', 'ta', 2),
('hero', 'title_line2', 'தொழுகை மேடைப் பள்ளிவாசல்', 'ta', 3),
('hero', 'subtitle', 'Ilayangudi Nesavu Pattadai Tholukai Medai Pallivasal', 'en', 4),
('hero', 'cta_primary', 'நன்கொடை வழங்க', 'ta', 5),
('hero', 'cta_secondary', 'மேலும் அறிய', 'ta', 6);

-- Insert default content for About Section
INSERT INTO public.landing_page_content (section, content_key, content_value, language, display_order) VALUES
('about', 'title', 'தொழுகை மேடை பள்ளிவாசல் பற்றி', 'ta', 1),
('about', 'paragraph1', 'இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல் என்பது நெசவாளர்களின் சமூகத்தால் நிறுவப்பட்ட ஒரு புனித வழிபாட்டுத் தலமாகும். இது சமூக சேவை, கல்வி மற்றும் ஆன்மீக வழிகாட்டுதலுக்கான மையமாக செயல்படுகிறது.', 'ta', 2),
('about', 'paragraph2', 'எங்கள் பள்ளிவாசல் திருமண பதிவு, மரண பதிவு, மற்றும் பல்வேறு சான்றிதழ் சேவைகளை வழங்குகிறது. மேலும், திருமண மண்டப முன்பதிவு மற்றும் நன்கொடை சேகரிப்பு போன்ற சேவைகளும் உள்ளன.', 'ta', 3),
('about', 'stat_members', '500+', 'ta', 4),
('about', 'stat_members_label', 'உறுப்பினர்கள்', 'ta', 5),
('about', 'stat_years', '50+', 'ta', 6),
('about', 'stat_years_label', 'ஆண்டுகள்', 'ta', 7),
('about', 'stat_marriages', '1000+', 'ta', 8),
('about', 'stat_marriages_label', 'திருமணங்கள் நடத்தப்பட்டன', 'ta', 9);

-- Insert default content for Services Section
INSERT INTO public.landing_page_content (section, content_key, content_value, language, display_order) VALUES
('services', 'title', 'ஆன்லைன் சேவைகள்', 'ta', 1),
('services', 'subtitle', 'Online Services', 'en', 2),
('services', 'mahal_title', 'மஹால் முன்பதிவு', 'ta', 3),
('services', 'mahal_subtitle', 'Mahal Booking', 'en', 4),
('services', 'mahal_description', 'திருமண மண்டபம் மற்றும் விருந்து வசதிகளை முன்பதிவு செய்யுங்கள்', 'ta', 5),
('services', 'donation_title', 'நன்கொடை', 'ta', 6),
('services', 'donation_subtitle', 'Donation', 'en', 7),
('services', 'donation_description', 'நோன்புக் கஞ்சி மற்றும் பொது நன்கொடைகள்', 'ta', 8),
('services', 'certificates_title', 'சான்றிதழ்கள்', 'ta', 9),
('services', 'certificates_subtitle', 'Certificates', 'en', 10),
('services', 'certificates_description', 'திருமண சான்றிதழ், இறப்புச் சான்றிதழ், போனாஃபைட்', 'ta', 11),
('services', 'events_title', 'நிகழ்வுகள்', 'ta', 12),
('services', 'events_subtitle', 'Events', 'en', 13),
('services', 'events_description', 'வரவிருக்கும் நிகழ்வுகள் மற்றும் அறிவிப்புகள்', 'ta', 14);

-- Insert default content for CTA Section
INSERT INTO public.landing_page_content (section, content_key, content_value, language, display_order) VALUES
('cta', 'title', 'சமூகத்தின் ஒரு பகுதியாக இருங்கள்', 'ta', 1),
('cta', 'subtitle', 'Join our community and stay connected with the mosque''s activities and services.', 'en', 2),
('cta', 'button_login', 'உள்நுழைக', 'ta', 3),
('cta', 'button_grievance', 'புகார் அளிக்க', 'ta', 4);