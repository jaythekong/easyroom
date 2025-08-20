-- Add sub_font_family field to welcome_screen_settings
ALTER TABLE welcome_screen_settings 
ADD COLUMN sub_font_family TEXT DEFAULT 'font-sans' 
  CHECK (sub_font_family IN ('font-sans', 'font-cursive', 'font-elegant', 'font-modern'));