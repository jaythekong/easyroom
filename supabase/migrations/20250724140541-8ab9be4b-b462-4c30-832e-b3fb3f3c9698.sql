-- Update function to handle both email-specific and link invitations
CREATE OR REPLACE FUNCTION public.accept_invitation_and_create_user(
  invitation_token uuid,
  user_email text,
  auth_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  -- If invitation.email is NULL or empty, it's a link invite and allows any email
  IF invitation_record.email IS NOT NULL 
     AND invitation_record.email != '' 
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
$$;