-- Fix the message_spacing check constraint to be more lenient
ALTER TABLE public.ticker_settings DROP CONSTRAINT IF EXISTS ticker_settings_message_spacing_check;
ALTER TABLE public.ticker_settings ADD CONSTRAINT ticker_settings_message_spacing_check CHECK (message_spacing >= 0 AND message_spacing <= 50);

-- Also update master_speed constraint to be more lenient 
ALTER TABLE public.ticker_settings DROP CONSTRAINT IF EXISTS ticker_settings_master_speed_check;
ALTER TABLE public.ticker_settings ADD CONSTRAINT ticker_settings_master_speed_check CHECK (master_speed >= 1 AND master_speed <= 500);