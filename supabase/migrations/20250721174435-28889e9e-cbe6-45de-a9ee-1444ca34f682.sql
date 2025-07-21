-- Add customization fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#ea580c';