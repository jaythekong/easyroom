-- Add tagline field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN tagline text DEFAULT 'Find and book your perfect meeting space';