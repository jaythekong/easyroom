-- Change animation_speed to integer from 0 to 5
ALTER TABLE welcome_screen_settings 
DROP CONSTRAINT IF EXISTS welcome_screen_settings_animation_speed_check;

ALTER TABLE welcome_screen_settings 
ALTER COLUMN animation_speed TYPE INTEGER USING 
  CASE 
    WHEN animation_speed = 'slow' THEN 2
    WHEN animation_speed = 'normal' THEN 3  
    WHEN animation_speed = 'fast' THEN 4
    ELSE 3
  END;

ALTER TABLE welcome_screen_settings 
ADD CONSTRAINT welcome_screen_settings_animation_speed_check 
CHECK (animation_speed >= 0 AND animation_speed <= 5);

ALTER TABLE welcome_screen_settings 
ALTER COLUMN animation_speed SET DEFAULT 3;