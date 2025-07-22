-- Add organization type and referral source fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN org_type TEXT,
ADD COLUMN referral_source TEXT;