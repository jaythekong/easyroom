-- Enhanced invitations table with metadata and tracking
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id);

-- Create invitation audit log table
CREATE TABLE IF NOT EXISTS public.invitation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'opened', 'accepted', 'expired', 'revoked', 'resent')),
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.invitation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Admins and super_admins can view audit logs"
  ON public.invitation_audit_log
  FOR SELECT
  USING (
    (auth.jwt()->'app_metadata'->>'super_admin')::boolean = true
    OR organization_id = ANY (get_user_admin_org_ids())
  );

CREATE POLICY "System can insert audit logs"
  ON public.invitation_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Update invitations RLS policies
DROP POLICY IF EXISTS "Public can view invitations by token" ON public.invitations;
DROP POLICY IF EXISTS "Public can view invitations by short code" ON public.invitations;

CREATE POLICY "Public can view minimal invite fields"
  ON public.invitations
  FOR SELECT
  USING (false);

-- Function to generate unique short codes
CREATE OR REPLACE FUNCTION public.generate_invitation_short_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to log invitation events
CREATE OR REPLACE FUNCTION public.log_invitation_event(
  invitation_id UUID,
  organization_id UUID,
  action TEXT,
  user_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to track invitation opens
CREATE OR REPLACE FUNCTION public.track_invitation_open(
  invitation_token UUID DEFAULT NULL,
  invitation_short_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to revoke invitation
CREATE OR REPLACE FUNCTION public.revoke_invitation(invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to resend invitation
CREATE OR REPLACE FUNCTION public.resend_invitation(invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger to auto-generate short codes and log creation
CREATE OR REPLACE FUNCTION public.auto_generate_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate short code if not provided
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_invitation_short_code();
  END IF;

  -- Set sent_by if not provided
  IF NEW.sent_by IS NULL THEN
    NEW.sent_by := auth.uid();
  END IF;

  -- Log creation event
  PERFORM public.log_invitation_event(
    NEW.id,
    NEW.organization_id,
    'created',
    NEW.sent_by,
    jsonb_build_object('email', NEW.email, 'role', NEW.role)
  );

  RETURN NEW;
END;
$$;

-- Create trigger for auto-generation
DROP TRIGGER IF EXISTS trigger_auto_generate_short_code ON public.invitations;
CREATE TRIGGER trigger_auto_generate_short_code
  BEFORE INSERT ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_short_code();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_invitation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS trigger_log_status_change ON public.invitations;
CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_status_change();