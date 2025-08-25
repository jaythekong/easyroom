-- Enable RLS on the security_compliance_log table and add appropriate policies
ALTER TABLE public.security_compliance_log ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view security compliance logs
CREATE POLICY "Super admins can view security compliance logs" 
ON public.security_compliance_log 
FOR SELECT 
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'super_admin'::text)::boolean = true);

-- Allow system to insert security compliance logs
CREATE POLICY "System can insert security compliance logs" 
ON public.security_compliance_log 
FOR INSERT 
WITH CHECK (true);