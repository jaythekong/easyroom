-- Add status field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Create platform audit log table
CREATE TABLE public.platform_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to view audit logs
CREATE POLICY "Super admins can view all audit logs" 
ON public.platform_audit_log 
FOR SELECT 
USING (
  (auth.jwt() ->> 'super_admin')::boolean = true
);

-- Create policy for super admins to insert audit logs
CREATE POLICY "Super admins can insert audit logs" 
ON public.platform_audit_log 
FOR INSERT 
WITH CHECK (
  (auth.jwt() ->> 'super_admin')::boolean = true AND
  user_id = auth.uid()
);

-- Create indexes for performance
CREATE INDEX idx_platform_audit_log_organization_id ON public.platform_audit_log (organization_id);
CREATE INDEX idx_platform_audit_log_created_at ON public.platform_audit_log (created_at DESC);
CREATE INDEX idx_platform_audit_log_action ON public.platform_audit_log (action);

-- Update organizations RLS to allow super admin access
CREATE POLICY "Super admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING ((auth.jwt() ->> 'super_admin')::boolean = true);

CREATE POLICY "Super admins can update organization status" 
ON public.organizations 
FOR UPDATE 
USING ((auth.jwt() ->> 'super_admin')::boolean = true)
WITH CHECK ((auth.jwt() ->> 'super_admin')::boolean = true);

-- Function to get organization stats
CREATE OR REPLACE FUNCTION public.get_organization_stats(org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'users', (SELECT COUNT(*) FROM user_organization_memberships WHERE organization_id = org_id),
    'rooms', (SELECT COUNT(*) FROM rooms WHERE organization_id = org_id),
    'bookings_30_days', (
      SELECT COUNT(*) 
      FROM bookings 
      WHERE organization_id = org_id 
      AND created_at >= NOW() - INTERVAL '30 days'
    ),
    'total_bookings', (SELECT COUNT(*) FROM bookings WHERE organization_id = org_id)
  );
$$;

-- Function to get platform stats
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'total_users', (SELECT COUNT(DISTINCT user_id) FROM user_organization_memberships),
    'total_rooms', (SELECT COUNT(*) FROM rooms),
    'total_bookings', (SELECT COUNT(*) FROM bookings),
    'active_organizations', (SELECT COUNT(*) FROM organizations WHERE status = 'active'),
    'suspended_organizations', (SELECT COUNT(*) FROM organizations WHERE status = 'suspended')
  );
$$;