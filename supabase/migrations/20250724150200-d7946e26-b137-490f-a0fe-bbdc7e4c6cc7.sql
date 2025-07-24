-- Update accept_invitation_link function to grab real email from auth.users
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

-- Backfill existing user_profiles with NULL emails
UPDATE user_profiles p
SET email = u.email, updated_at = now()
FROM auth.users u
WHERE p.email IS NULL
  AND p.user_id = u.id;

-- Add NOT NULL constraint to email column going forward
ALTER TABLE user_profiles 
ALTER COLUMN email SET NOT NULL;