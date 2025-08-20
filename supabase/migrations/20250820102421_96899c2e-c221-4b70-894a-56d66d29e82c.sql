-- Change animation_speed to integer from 0 to 5
ALTER TABLE welcome_screen_settings 
DROP CONSTRAINT IF EXISTS welcome_screen_settings_animation_speed_check;

-- Remove default first
ALTER TABLE welcome_screen_settings 
ALTER COLUMN animation_speed DROP DEFAULT;

-- Change the type with conversion, using proper text casting
ALTER TABLE welcome_screen_settings 
ALTER COLUMN animation_speed TYPE INTEGER USING 
  CASE 
    WHEN animation_speed::text = 'slow' THEN 2
    WHEN animation_speed::text = 'normal' THEN 3  
    WHEN animation_speed::text = 'fast' THEN 4
    ELSE 3
  END;

-- Set new default
ALTER TABLE welcome_screen_settings 
ALTER COLUMN animation_speed SET DEFAULT 3;

-- Add constraint
ALTER TABLE welcome_screen_settings 
ADD CONSTRAINT welcome_screen_settings_animation_speed_check 
CHECK (animation_speed >= 0 AND animation_speed <= 5);