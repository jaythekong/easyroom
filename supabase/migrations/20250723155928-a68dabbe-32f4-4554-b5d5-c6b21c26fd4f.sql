-- Create audit table for unauthorized access attempts
CREATE TABLE public.unauthorized_access_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  attempted_slug TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.unauthorized_access_attempts ENABLE ROW LEVEL SECURITY;

-- Allow admins to view audit logs
CREATE POLICY "Admins can view unauthorized access attempts" 
ON public.unauthorized_access_attempts 
FOR SELECT 
USING (has_role('admin'::user_role));

-- Allow anyone to insert (for logging purposes)
CREATE POLICY "Allow logging unauthorized access attempts" 
ON public.unauthorized_access_attempts 
FOR INSERT 
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_unauthorized_access_user_id ON public.unauthorized_access_attempts (user_id);
CREATE INDEX idx_unauthorized_access_attempted_at ON public.unauthorized_access_attempts (attempted_at);
CREATE INDEX idx_unauthorized_access_slug ON public.unauthorized_access_attempts (attempted_slug);