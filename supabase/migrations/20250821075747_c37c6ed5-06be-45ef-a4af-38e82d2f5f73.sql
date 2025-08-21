-- Fix the remaining functions that need search_path hardening

-- Update get_room_gaps function
CREATE OR REPLACE FUNCTION public.get_room_gaps(p_room_id uuid, p_date date)
 RETURNS TABLE(gap_start timestamp with time zone, gap_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    day_start TIMESTAMPTZ;
    day_end TIMESTAMPTZ;
    prev_end TIMESTAMPTZ;
    rec RECORD;
BEGIN
    -- Set the business hours (8 AM to 10 PM)
    day_start := p_date::TIMESTAMPTZ + INTERVAL '8 hours';
    day_end := p_date::TIMESTAMPTZ + INTERVAL '22 hours';
    
    -- Initialize previous end time to start of business hours
    prev_end := day_start;
    
    -- Get all bookings and downtime for the room on the specified date, ordered by start time
    FOR rec IN (
        SELECT start_time, end_time
        FROM (
            -- Get bookings
            SELECT start_time, end_time
            FROM bookings
            WHERE room_id = p_room_id 
            AND DATE(start_time AT TIME ZONE 'UTC') = p_date
            AND status = 'confirmed'
            
            UNION ALL
            
            -- Get downtime
            SELECT start_time, end_time
            FROM room_downtime
            WHERE room_id = p_room_id
            AND DATE(start_time AT TIME ZONE 'UTC') = p_date
        ) AS combined_events
        ORDER BY start_time
    ) LOOP
        -- If there's a gap between previous end and current start, return it
        IF prev_end < rec.start_time THEN
            gap_start := prev_end;
            gap_end := rec.start_time;
            RETURN NEXT;
        END IF;
        
        -- Update previous end time (handle overlapping bookings)
        IF rec.end_time > prev_end THEN
            prev_end := rec.end_time;
        END IF;
    END LOOP;
    
    -- If there's time left after the last booking until end of business hours
    IF prev_end < day_end THEN
        gap_start := prev_end;
        gap_end := day_end;
        RETURN NEXT;
    END IF;
    
    -- If no bookings at all, return the entire business day as a gap
    IF NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = p_room_id 
        AND DATE(start_time AT TIME ZONE 'UTC') = p_date
        AND status = 'confirmed'
        
        UNION ALL
        
        SELECT 1 FROM room_downtime
        WHERE room_id = p_room_id
        AND DATE(start_time AT TIME ZONE 'UTC') = p_date
    ) THEN
        gap_start := day_start;
        gap_end := day_end;
        RETURN NEXT;
    END IF;
END;
$function$;

-- Update impersonate_admin function
CREATE OR REPLACE FUNCTION public.impersonate_admin(target_org_id uuid, impersonation_mode text DEFAULT 'view_only'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update end_impersonation function
CREATE OR REPLACE FUNCTION public.end_impersonation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update accept_invitation_and_create_user functions
CREATE OR REPLACE FUNCTION public.accept_invitation_and_create_user(invitation_token uuid, user_email text, auth_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  membership_inserted INTEGER;
BEGIN
  -- Get invitation details with all validations
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE invite_token = invitation_token
    AND status = 'pending'
    AND accepted_at IS NULL
    AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'INVITE_404: Invitation not found, expired, or already accepted';
  END IF;

  -- Validate email match ONLY for email-specific invitations
  -- Treat NULL or empty string as "no email restriction" (link invite)
  IF invitation_record.email IS NOT NULL
     AND length(trim(invitation_record.email)) > 0
     AND invitation_record.email IS DISTINCT FROM user_email THEN
    RAISE EXCEPTION 'INVITE_EMAIL_MISMATCH: Invitation is for a different email address';
  END IF;

  -- Check if membership already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM user_organization_memberships 
    WHERE user_id = auth_user_id 
      AND organization_id = invitation_record.organization_id
  ) THEN
    -- Mark invite as accepted anyway
    UPDATE public.invitations
    SET accepted_at = now(), status = 'accepted'
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already member of organization'
    );
  END IF;

  -- Create membership with return check
  INSERT INTO public.user_organization_memberships (
    user_id,
    organization_id,
    role
  ) VALUES (
    auth_user_id,
    invitation_record.organization_id,
    invitation_record.role
  )
  ON CONFLICT DO NOTHING
  RETURNING 1 INTO membership_inserted;

  -- Check if insert actually happened
  IF membership_inserted IS NULL THEN
    RAISE EXCEPTION 'INVITE_MEMBERSHIP_FAILED: Failed to create organization membership due to conflict';
  END IF;

  -- Create/update user profile
  INSERT INTO public.user_profiles (
    user_id,
    organization_id,
    role,
    email
  ) VALUES (
    auth_user_id,
    invitation_record.organization_id,
    invitation_record.role,
    user_email
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    updated_at = now();

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET 
    accepted_at = now(),
    status = 'accepted'
  WHERE id = invitation_record.id;

  -- Log the acceptance
  PERFORM public.log_invitation_event(
    invitation_record.id,
    invitation_record.organization_id,
    'accepted',
    auth_user_id,
    jsonb_build_object('accepted_by_email', user_email)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully accepted invitation and created user'
  );
END;
$function$;