-- Enforce that all invitations are generic link invites (email is always NULL)
ALTER TABLE public.invitations
  ADD CONSTRAINT invite_email_null_chk
  CHECK (email IS NULL);

-- Add comment to document the design decision
COMMENT ON COLUMN public.invitations.email
  IS 'null = generic link invite; retained for future email-specific invites';

-- Create simplified accept invitation function for link-only invites
CREATE OR REPLACE FUNCTION public.accept_invitation_link(
  invitation_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inv  RECORD;
  uid  uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

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

  -- Idempotent create profile
  INSERT INTO user_profiles (user_id, organization_id, role)
  VALUES (uid, inv.organization_id, inv.role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  -- Log the acceptance
  PERFORM log_invitation_event(inv.id, inv.organization_id, 'accepted', uid);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation_link(uuid) TO authenticated;