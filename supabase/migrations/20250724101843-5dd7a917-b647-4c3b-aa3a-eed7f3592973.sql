-- Create a public invitation lookup function that allows anonymous access
CREATE OR REPLACE FUNCTION public.get_invitation_details(invitation_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Log the access
  PERFORM public.log_invitation_event(
    invitation_record.id,
    invitation_record.organization_id,
    'accessed'
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
$$;