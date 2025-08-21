-- Disable all active demo configurations temporarily
UPDATE public.demo_configuration 
SET demo_enabled = false 
WHERE is_active = true;