-- Add new integer column for animation speed
ALTER TABLE welcome_screen_settings 
ADD COLUMN animation_speed_new INTEGER DEFAULT 3;

-- Convert existing data
UPDATE welcome_screen_settings 
SET animation_speed_new = 
  CASE 
    WHEN animation_speed = 'slow' THEN 2
    WHEN animation_speed = 'normal' THEN 3  
    WHEN animation_speed = 'fast' THEN 4
    ELSE 3
  END;

-- Drop old column
ALTER TABLE welcome_screen_settings 
DROP COLUMN animation_speed;

-- Rename new column
ALTER TABLE welcome_screen_settings 
RENAME COLUMN animation_speed_new TO animation_speed;

-- Add constraint
ALTER TABLE welcome_screen_settings 
ADD CONSTRAINT welcome_screen_settings_animation_speed_check 
CHECK (animation_speed >= 0 AND animation_speed <= 5);