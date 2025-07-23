-- Create impersonate admin function
CREATE OR REPLACE FUNCTION public.impersonate_admin(
  target_org_id UUID,
  impersonation_mode TEXT DEFAULT 'view_only'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_admin_id UUID;
  impersonator_id UUID;
  new_jwt TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
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
  
  -- Find the target organization's admin
  SELECT user_id INTO target_admin_id
  FROM public.user_organization_memberships
  WHERE organization_id = target_org_id 
    AND role = 'admin'::user_role
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF target_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin found for organization %', target_org_id;
  END IF;
  
  -- Set expiration to 15 minutes from now
  expires_at := now() + interval '15 minutes';
  
  -- Create new app_metadata with impersonation info
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'impersonator_id', impersonator_id,
      'impersonation_mode', impersonation_mode,
      'impersonation_expires_at', extract(epoch from expires_at)
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
      'impersonation_mode', impersonation_mode,
      'expires_at', expires_at
    )
  );
  
  RETURN jsonb_build_object(
    'target_user_id', target_admin_id,
    'impersonation_mode', impersonation_mode,
    'expires_at', expires_at,
    'success', true
  );
END;
$$;

-- Create function to end impersonation
CREATE OR REPLACE FUNCTION public.end_impersonation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  impersonator_id UUID;
  original_metadata jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user's metadata
  SELECT raw_app_meta_data INTO original_metadata
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Extract impersonator info
  impersonator_id := (original_metadata ->> 'impersonator_id')::UUID;
  
  IF impersonator_id IS NULL THEN
    RAISE EXCEPTION 'User is not being impersonated';
  END IF;
  
  -- Remove impersonation metadata
  UPDATE auth.users 
  SET raw_app_meta_data = 
    original_metadata - 'impersonator_id' - 'impersonation_mode' - 'impersonation_expires_at'
  WHERE id = current_user_id;
  
  -- Log the impersonation end
  INSERT INTO public.platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    impersonator_id,
    (SELECT organization_id FROM user_organization_memberships WHERE user_id = current_user_id LIMIT 1),
    'impersonation_end',
    jsonb_build_object(
      'target_user_id', current_user_id,
      'ended_at', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'impersonator_id', impersonator_id
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.impersonate_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_impersonation() TO authenticated;