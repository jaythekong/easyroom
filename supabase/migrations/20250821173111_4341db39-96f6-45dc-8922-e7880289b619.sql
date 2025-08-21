-- Add demo_enabled field to demo_configuration table
ALTER TABLE public.demo_configuration 
ADD COLUMN demo_enabled boolean NOT NULL DEFAULT true;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN public.demo_configuration.demo_enabled IS 'Whether the live demo is enabled for public access';