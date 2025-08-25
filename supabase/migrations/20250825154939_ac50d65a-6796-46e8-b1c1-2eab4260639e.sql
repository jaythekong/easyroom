-- Enable leaked password protection for better security
-- This is handled via Supabase Auth settings, not SQL
-- But we can document this requirement

-- Create a table to track security settings compliance
CREATE TABLE IF NOT EXISTS public.security_compliance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Log the leaked password protection requirement
INSERT INTO public.security_compliance_log (setting_name, status, notes)
VALUES (
  'leaked_password_protection', 
  'requires_manual_setup', 
  'Must be enabled in Supabase Auth settings > Password Strength. This prevents users from using commonly leaked passwords.'
);