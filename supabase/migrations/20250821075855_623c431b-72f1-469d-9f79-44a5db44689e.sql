-- Complete the remaining function security fixes

-- Update the remaining accept_invitation_and_create_user overload function
CREATE OR REPLACE FUNCTION public.accept_invitation_and_create_user(invitation_token uuid, user_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  auth_user_id UUID;
  membership_inserted INTEGER;
BEGIN
  -- Get authenticated user ID
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: User must be authenticated to accept invitation';
  END IF;

  -- Belt-and-suspenders: Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: User does not exist in authentication system';
  END IF;

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

-- Update all remaining functions that need search_path hardening
CREATE OR REPLACE FUNCTION public.resend_invitation(invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  new_token UUID;
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

  -- Generate new token and extend expiry
  new_token := gen_random_uuid();
  
  UPDATE public.invitations 
  SET 
    invite_token = new_token,
    expires_at = now() + interval '7 days',
    status = 'pending',
    resend_count = resend_count + 1,
    last_resent_at = now(),
    revoked_at = NULL,
    revoked_by = NULL
  WHERE id = invitation_id;

  -- Log the resend event
  PERFORM public.log_invitation_event(
    invitation_id,
    invitation_record.organization_id,
    'resent',
    auth.uid(),
    jsonb_build_object(
      'new_token', new_token,
      'resent_by_email', (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation resent successfully',
    'new_token', new_token
  );
END;
$function$;

-- Update all trigger functions
CREATE OR REPLACE FUNCTION public.log_invitation_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_invitation_event(
      NEW.id,
      NEW.organization_id,
      NEW.status,
      auth.uid(),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$function$;