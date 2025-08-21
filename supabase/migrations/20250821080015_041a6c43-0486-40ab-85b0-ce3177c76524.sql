-- Fix the final remaining functions that need search_path hardening

-- Update remaining invitation-related functions
CREATE OR REPLACE FUNCTION public.auto_generate_short_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- For AFTER INSERT trigger, we need to UPDATE the row with generated values
  UPDATE public.invitations 
  SET 
    short_code = COALESCE(NEW.short_code, public.generate_invitation_short_code()),
    sent_by = COALESCE(NEW.sent_by, auth.uid())
  WHERE id = NEW.id;

  -- Now log creation event with the committed invitation
  PERFORM public.log_invitation_event(
    NEW.id,
    NEW.organization_id,
    'created',
    COALESCE(NEW.sent_by, auth.uid()),
    jsonb_build_object('email', NEW.email, 'role', NEW.role)
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invitation_link(invitation_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv  RECORD;
  uid  uuid := auth.uid();
  real_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- Get the real email from auth.users
  SELECT email INTO real_email FROM auth.users WHERE id = uid;

  -- Impersonate for RLS
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT * INTO inv
  FROM invitations
  WHERE invite_token = invitation_token
    AND status = 'pending'
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  -- Idempotent create membership
  INSERT INTO user_organization_memberships (user_id, organization_id, role)
  VALUES (uid, inv.organization_id, inv.role)
  ON CONFLICT DO NOTHING;

  -- Idempotent create profile with real email
  INSERT INTO user_profiles (user_id, organization_id, role, email)
  VALUES (uid, inv.organization_id, inv.role, real_email)
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET 
    email = EXCLUDED.email, 
    updated_at = now();

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  -- Log the acceptance
  PERFORM log_invitation_event(inv.id, inv.organization_id, 'accepted', uid);

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invitation_short_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    
    IF NOT EXISTS (SELECT 1 FROM public.invitations WHERE short_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_invitation_event(invitation_id uuid, organization_id uuid, action text, user_id uuid DEFAULT NULL::uuid, metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.invitation_audit_log (
    invitation_id,
    organization_id,
    action,
    user_id,
    metadata
  ) VALUES (
    invitation_id,
    organization_id,
    action,
    user_id,
    metadata
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_invitation_open(invitation_token uuid DEFAULT NULL::uuid, invitation_short_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find invitation by token or short code
  IF invitation_token IS NOT NULL THEN
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE invite_token = invitation_token;
  ELSIF invitation_short_code IS NOT NULL THEN
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE short_code = invitation_short_code;
  ELSE
    RAISE EXCEPTION 'Either token or short_code must be provided';
  END IF;

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Update open count and timestamp
  UPDATE public.invitations 
  SET 
    open_count = open_count + 1,
    last_opened_at = now()
  WHERE id = invitation_record.id;

  -- Log the open event
  PERFORM public.log_invitation_event(
    invitation_record.id,
    invitation_record.organization_id,
    'opened'
  );

  -- Return invitation details for the UI
  RETURN jsonb_build_object(
    'id', invitation_record.id,
    'email', invitation_record.email,
    'role', invitation_record.role,
    'organization_id', invitation_record.organization_id,
    'expires_at', invitation_record.expires_at,
    'status', invitation_record.status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_invitation(invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE id = invitation_id;

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Check permissions
  IF NOT (
    (auth.jwt()->'app_metadata'->>'super_admin')::boolean = true
    OR has_role_in_org('admin'::user_role, invitation_record.organization_id)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update invitation status
  UPDATE public.invitations 
  SET 
    status = 'revoked',
    revoked_at = now(),
    revoked_by = auth.uid()
  WHERE id = invitation_id;

  -- Log the revoke event
  PERFORM public.log_invitation_event(
    invitation_id,
    invitation_record.organization_id,
    'revoked',
    auth.uid(),
    jsonb_build_object('revoked_by_email', (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation revoked successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_invitation_details(invitation_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  organization_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE invite_token = invitation_token
    AND accepted_at IS NULL
    AND expires_at > now()
    AND status = 'pending';

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;

  -- Get organization details
  SELECT * INTO organization_record 
  FROM public.organizations 
  WHERE id = invitation_record.organization_id;

  -- Update tracking
  UPDATE public.invitations 
  SET 
    open_count = open_count + 1,
    last_opened_at = now()
  WHERE id = invitation_record.id;

  -- Log the access with correct action name
  PERFORM public.log_invitation_event(
    invitation_record.id,
    invitation_record.organization_id,
    'opened'
  );

  -- Return safe invitation and organization data
  RETURN jsonb_build_object(
    'id', invitation_record.id,
    'email', invitation_record.email,
    'role', invitation_record.role,
    'expires_at', invitation_record.expires_at,
    'organization', jsonb_build_object(
      'id', organization_record.id,
      'name', organization_record.name,
      'slug', organization_record.slug,
      'logo_url', organization_record.logo_url,
      'primary_color', organization_record.primary_color,
      'tagline', organization_record.tagline
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_organization(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  deleted_counts jsonb := '{}';
  temp_count integer;
BEGIN
  -- Verify caller is super admin
  IF NOT ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true) THEN
    RAISE EXCEPTION 'Only super admins can delete organizations';
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF org_record.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Delete in order to handle foreign key constraints
  -- Start with child tables and work up to parent tables
  
  -- Delete booking-related data
  DELETE FROM bookings WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('bookings', temp_count);

  -- Delete room-related data
  DELETE FROM room_downtime WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('room_downtime', temp_count);

  DELETE FROM room_amenities WHERE room_id IN (
    SELECT id FROM rooms WHERE organization_id = org_id
  );
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('room_amenities', temp_count);

  DELETE FROM rooms WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('rooms', temp_count);

  -- Delete user-related data
  DELETE FROM user_profiles WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('user_profiles', temp_count);

  DELETE FROM user_organization_memberships WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('user_memberships', temp_count);

  -- Delete organization-specific settings
  DELETE FROM welcome_screen_settings WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('welcome_settings', temp_count);

  DELETE FROM ticker_messages WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ticker_messages', temp_count);

  DELETE FROM ticker_settings WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ticker_settings', temp_count);

  -- Delete amenities
  DELETE FROM amenities WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('amenities', temp_count);

  -- Delete invitations
  DELETE FROM invitations WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('invitations', temp_count);

  -- Delete telegram subscriptions
  DELETE FROM telegram_subscriptions WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('telegram_subscriptions', temp_count);

  -- Delete audit logs
  DELETE FROM invitation_audit_log WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('invitation_audit_logs', temp_count);

  DELETE FROM platform_audit_log WHERE organization_id = org_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('platform_audit_logs', temp_count);

  -- Finally, delete the organization itself
  DELETE FROM organizations WHERE id = org_id;

  -- Log the deletion
  INSERT INTO platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    org_id,
    'organization_deleted',
    jsonb_build_object(
      'organization_name', org_record.name,
      'organization_slug', org_record.slug,
      'deleted_data_counts', deleted_counts,
      'deleted_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_name', org_record.name,
    'organization_slug', org_record.slug,
    'deleted_data_counts', deleted_counts
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(org_id uuid, new_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  new_admin_id uuid;
  current_admin_count integer;
  membership_exists boolean;
BEGIN
  -- Verify caller is super admin
  IF NOT ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true) THEN
    RAISE EXCEPTION 'Only super admins can transfer organization ownership';
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF org_record.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Find the new admin user by email
  SELECT id INTO new_admin_id 
  FROM auth.users 
  WHERE email = new_admin_email;
  
  IF new_admin_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', new_admin_email;
  END IF;

  -- Check if user is already a member of the organization
  SELECT EXISTS(
    SELECT 1 FROM user_organization_memberships 
    WHERE user_id = new_admin_id AND organization_id = org_id
  ) INTO membership_exists;

  -- If user is already a member, update their role to admin
  IF membership_exists THEN
    UPDATE user_organization_memberships 
    SET role = 'admin'::user_role, updated_at = now()
    WHERE user_id = new_admin_id AND organization_id = org_id;
    
    -- Update their profile role as well
    UPDATE user_profiles 
    SET role = 'admin'::user_role, updated_at = now()
    WHERE user_id = new_admin_id AND organization_id = org_id;
  ELSE
    -- Create new membership and profile for the new admin
    INSERT INTO user_organization_memberships (user_id, organization_id, role)
    VALUES (new_admin_id, org_id, 'admin'::user_role);
    
    INSERT INTO user_profiles (user_id, organization_id, role, email)
    VALUES (new_admin_id, org_id, 'admin'::user_role, new_admin_email);
  END IF;

  -- Count current admins after the update
  SELECT COUNT(*) INTO current_admin_count
  FROM user_organization_memberships 
  WHERE organization_id = org_id AND role = 'admin'::user_role;

  -- Log the ownership transfer
  INSERT INTO platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    org_id,
    'ownership_transferred',
    jsonb_build_object(
      'new_admin_email', new_admin_email,
      'new_admin_id', new_admin_id,
      'organization_name', org_record.name,
      'was_existing_member', membership_exists,
      'total_admins_after_transfer', current_admin_count,
      'transferred_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_name', org_record.name,
    'new_admin_email', new_admin_email,
    'was_existing_member', membership_exists,
    'total_admins', current_admin_count
  );
END;
$function$;