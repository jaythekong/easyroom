-- Add timezone field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN timezone text DEFAULT 'America/New_York';