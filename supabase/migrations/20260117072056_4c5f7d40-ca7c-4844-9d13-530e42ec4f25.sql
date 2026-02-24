-- Insert default content for About page sections
INSERT INTO public.landing_page_content (section, content_key, content_value, content_type, language, display_order, is_active) VALUES
-- About Hero Section
('about_hero', 'title', 'ஐ.என்.பி பற்றி', 'text', 'ta', 1, true),
('about_hero', 'subtitle', 'About I.N.P. - Ilayangudi Nesavu Pattadai Tholukai Medai Pallivasal', 'text', 'en', 2, true),

-- About History Section
('about_history', 'heading', 'தொழுகை மேடை பள்ளிவாசலின் வரலாறு', 'text', 'ta', 1, true),
('about_history', 'paragraph1', 'இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல் என்பது பல தசாப்தங்களாக இளையான்குடி நெசவாளர் சமூகத்திற்கு சேவை செய்து வரும் ஒரு புனித வழிபாட்டுத் தலமாகும். இது சிவகங்கை மாவட்டத்தில் அமைந்துள்ளது.', 'text', 'ta', 2, true),
('about_history', 'paragraph2', 'நெசவாளர்களின் ஒற்றுமையையும், அவர்களின் ஆன்மீக தேவைகளையும் கருத்தில் கொண்டு இந்த பள்ளிவாசல் நிறுவப்பட்டது. இது ஐந்து வேளை தொழுகை நடத்துவதோடு, சமூக நிகழ்வுகள், கல்வி நடவடிக்கைகள், மற்றும் நலன்புரி சேவைகளையும் ஒருங்கிணைக்கிறது.', 'text', 'ta', 3, true),

-- About Mosques Section
('about_mosques', 'heading', 'எங்கள் இரண்டு பள்ளிவாசல்கள்', 'text', 'ta', 1, true),
('about_mosques', 'heading_en', 'Our Two Mosques', 'text', 'en', 2, true),
('about_mosques', 'mosque1_title', 'தொழுகை மேடை பள்ளிவாசல்', 'text', 'ta', 3, true),
('about_mosques', 'mosque1_description', 'இது எங்கள் முக்கிய பள்ளிவாசலாகும். ஐந்து வேளை தொழுகை, ஜும்மா தொழுகை, மற்றும் சிறப்பு நிகழ்வுகள் இங்கே நடத்தப்படுகின்றன. திருமண நிகழ்ச்சிகள் மற்றும் மற்ற சமூக நிகழ்வுகளுக்கான மண்டபமும் இங்கே உள்ளது.', 'text', 'ta', 4, true),
('about_mosques', 'mosque2_title', 'ஜுமுஆ பள்ளிவாசல்', 'text', 'ta', 5, true),
('about_mosques', 'mosque2_description', 'சமூகத்தின் தேவைகளை பூர்த்தி செய்வதற்காக இந்த துணை பள்ளிவாசல் நிறுவப்பட்டது. இது தினசரி தொழுகைகள் மற்றும் மத கல்வி வகுப்புகளுக்காக பயன்படுத்தப்படுகிறது.', 'text', 'ta', 6, true),

-- About Wakf Section
('about_wakf', 'heading', 'வக்ஃப் சொத்துக்கள்', 'text', 'ta', 1, true),
('about_wakf', 'description', 'எங்கள் பள்ளிவாசலுக்கு பல்வேறு வக்ஃப் சொத்துக்கள் உள்ளன. இவை சமூகத்தின் நலனுக்காக பயன்படுத்தப்படுகின்றன. வக்ஃப் சொத்துக்களில் இருந்து கிடைக்கும் வருமானம் பள்ளிவாசலின் பராமரிப்பு, கல்வி நடவடிக்கைகள், மற்றும் சமூக நலன்புரி செயல்பாடுகளுக்கு பயன்படுத்தப்படுகிறது.', 'text', 'ta', 2, true),
('about_wakf', 'asset1', 'நிலங்கள்', 'text', 'ta', 3, true),
('about_wakf', 'asset2', 'கட்டிடங்கள்', 'text', 'ta', 4, true),
('about_wakf', 'asset3', 'மண்டபங்கள்', 'text', 'ta', 5, true),

-- About Management Section
('about_management', 'heading', 'நிர்வாகக் குழு', 'text', 'ta', 1, true),
('about_management', 'heading_en', 'Management Committee', 'text', 'en', 2, true)
ON CONFLICT DO NOTHING;