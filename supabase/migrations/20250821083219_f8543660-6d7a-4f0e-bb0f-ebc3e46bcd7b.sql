-- Fix the impersonate_admin function by first dropping it and recreating it
DROP FUNCTION IF EXISTS impersonate_admin(uuid, text);

-- Recreate the impersonate_admin function with proper session management
CREATE OR REPLACE FUNCTION impersonate_admin(target_org_id UUID, impersonation_mode TEXT DEFAULT 'view_only')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_admin_id UUID;
  impersonator_id UUID;
  target_user_email TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Verify caller is super admin
  IF NOT ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true) THEN
    RAISE EXCEPTION 'Only super admins can impersonate users';
  END IF;
  
  -- Validate impersonation mode
  IF impersonation_mode NOT IN ('view_only', 'full') THEN
    RAISE EXCEPTION 'Invalid impersonation mode. Must be view_only or full';
  END IF;

  -- Get the impersonator's ID
  impersonator_id := auth.uid();
  
  -- Find the target organization's admin and their email
  SELECT uom.user_id, au.email INTO target_admin_id, target_user_email
  FROM public.user_organization_memberships uom
  JOIN auth.users au ON au.id = uom.user_id
  WHERE uom.organization_id = target_org_id 
    AND uom.role = 'admin'::user_role
  ORDER BY uom.created_at ASC
  LIMIT 1;
  
  IF target_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin found for organization %', target_org_id;
  END IF;
  
  -- Set expiration to 15 minutes from now
  expires_at := now() + interval '15 minutes';
  
  -- Update the target user's metadata to include impersonation info
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'impersonator_id', impersonator_id,
      'impersonation_mode', impersonation_mode,
      'impersonation_expires_at', extract(epoch from expires_at),
      'original_user_id', target_admin_id
    )
  WHERE id = target_admin_id;
  
  -- Log the impersonation start
  INSERT INTO public.platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    impersonator_id,
    target_org_id,
    'impersonation_start',
    jsonb_build_object(
      'target_user_id', target_admin_id,
      'target_user_email', target_user_email,
      'impersonation_mode', impersonation_mode,
      'expires_at', expires_at
    )
  );
  
  -- Return the result with target user info
  result := json_build_object(
    'target_user_id', target_admin_id,
    'target_user_email', target_user_email,
    'impersonation_mode', impersonation_mode,
    'expires_at', expires_at,
    'organization_id', target_org_id,
    'success', true
  );
  
  RETURN result;
END;
$$;