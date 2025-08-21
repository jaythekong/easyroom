-- Security Fix Phase 1: Database Function Hardening
-- Add SET search_path TO 'public' to all functions to prevent privilege escalation

-- Update get_organization_stats function
CREATE OR REPLACE FUNCTION public.get_organization_stats(org_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update get_platform_stats function
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'total_users', (SELECT COUNT(DISTINCT user_id) FROM user_organization_memberships),
    'total_rooms', (SELECT COUNT(*) FROM rooms),
    'total_bookings', (SELECT COUNT(*) FROM bookings),
    'active_organizations', (SELECT COUNT(*) FROM organizations WHERE status = 'active'),
    'suspended_organizations', (SELECT COUNT(*) FROM organizations WHERE status = 'suspended')
  );
$function$;

-- Update get_user_organization_ids function
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ARRAY_AGG(organization_id) 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid();
$function$;

-- Update get_user_primary_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$function$;

-- Update has_role_in_org function
CREATE OR REPLACE FUNCTION public.has_role_in_org(required_role user_role, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() 
    AND role = required_role
    AND (org_id IS NULL OR organization_id = org_id)
  );
$function$;

-- Update get_user_role_in_org function
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(org_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  AND organization_id = org_id;
$function$;

-- Update get_user_memberships function
CREATE OR REPLACE FUNCTION public.get_user_memberships(p_user_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, role user_role, created_at timestamp with time zone, updated_at timestamp with time zone, organizations jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    uom.id,
    uom.organization_id,
    uom.role,
    uom.created_at,
    uom.updated_at,
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'logo_url', o.logo_url,
      'primary_color', o.primary_color,
      'timezone', o.timezone,
      'tagline', o.tagline
    ) as organizations
  FROM public.user_organization_memberships uom
  JOIN public.organizations o ON o.id = uom.organization_id
  WHERE uom.user_id = p_user_id
  ORDER BY uom.created_at ASC;
$function$;

-- Update get_user_admin_org_ids function
CREATE OR REPLACE FUNCTION public.get_user_admin_org_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ARRAY_AGG(organization_id) 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  AND role = 'admin'::user_role;
$function$;

-- Update get_user_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$function$;

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$function$;

-- Update has_telegram_sub function
CREATE OR REPLACE FUNCTION public.has_telegram_sub(p_user uuid, p_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM telegram_subscriptions
    WHERE user_id = p_user
      AND organization_id = p_org
  );
$function$;

-- Security Fix Phase 2: Invitation System Security
-- Restrict public invitation access to require specific token/short_code lookup
DROP POLICY IF EXISTS "Public can view invitations by short code" ON public.invitations;

-- Create more secure policy that only allows access with specific tokens
CREATE POLICY "Public can view specific valid invitations" 
ON public.invitations 
FOR SELECT 
USING (
  status = 'pending'::text 
  AND accepted_at IS NULL 
  AND revoked_at IS NULL 
  AND expires_at > now()
  AND (
    -- Only allow access if the request includes the specific token or short_code
    -- This prevents enumeration of all pending invitations
    current_setting('request.jwt.claim.invitation_token', true) = invite_token::text
    OR current_setting('request.jwt.claim.invitation_short_code', true) = short_code
  )
);

-- Add security logging for invitation access attempts
CREATE OR REPLACE FUNCTION public.log_invitation_access_attempt(
  attempted_token text DEFAULT NULL,
  attempted_short_code text DEFAULT NULL,
  access_granted boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log security-relevant invitation access attempts
  INSERT INTO public.invitation_audit_log (
    invitation_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    NULL, -- No specific invitation for failed attempts
    NULL, -- No specific organization for failed attempts
    CASE WHEN access_granted THEN 'invitation_accessed' ELSE 'invitation_access_denied' END,
    jsonb_build_object(
      'attempted_token', attempted_token,
      'attempted_short_code', attempted_short_code,
      'access_granted', access_granted,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::jsonb ->> 'user-agent'
    )
  );
END;
$function$;