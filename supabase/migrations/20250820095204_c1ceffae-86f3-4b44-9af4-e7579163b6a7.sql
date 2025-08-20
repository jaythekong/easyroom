-- Add new columns to welcome_screen_settings table
ALTER TABLE welcome_screen_settings 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'font-sans',
ADD COLUMN IF NOT EXISTS text_shadow BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS text_outline BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS logo_position TEXT DEFAULT 'bottom-right',
ADD COLUMN IF NOT EXISTS animation_speed TEXT DEFAULT 'normal';

-- Add constraints for the new columns
ALTER TABLE welcome_screen_settings 
ADD CONSTRAINT font_family_check CHECK (font_family IN ('font-sans', 'font-cursive', 'font-elegant', 'font-modern')),
ADD CONSTRAINT logo_position_check CHECK (logo_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center-bottom')),
ADD CONSTRAINT animation_speed_check CHECK (animation_speed IN ('slow', 'normal', 'fast'));