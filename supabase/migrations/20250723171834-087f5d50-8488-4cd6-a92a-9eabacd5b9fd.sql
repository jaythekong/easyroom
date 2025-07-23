-- Fix RLS policies to use correct JWT path for super_admin claim
-- The super_admin claim is stored in app_metadata, not at the root level

-- Fix organizations table policies
DROP POLICY IF EXISTS "Super admins can update organization status" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;

CREATE POLICY "Super admins can update organization status" 
ON public.organizations 
FOR UPDATE 
USING ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true)
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true);

CREATE POLICY "Super admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true);

-- Fix platform_audit_log table policies  
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.platform_audit_log;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.platform_audit_log;

CREATE POLICY "Super admins can insert audit logs" 
ON public.platform_audit_log 
FOR INSERT 
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true 
  AND user_id = auth.uid()
);

CREATE POLICY "Super admins can view all audit logs" 
ON public.platform_audit_log 
FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true);