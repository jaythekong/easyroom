-- Add sub text and related fields to welcome_screen_settings
ALTER TABLE welcome_screen_settings 
ADD COLUMN sub_text TEXT,
ADD COLUMN sub_text_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN sub_text_size TEXT DEFAULT 'text-2xl' 
  CHECK (sub_text_size IN ('text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'));