-- Fix trigger timing issue - run AFTER INSERT so invitation exists
DROP TRIGGER IF EXISTS trigger_auto_generate_short_code ON public.invitations;

-- Update trigger function to work with AFTER INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create the trigger as AFTER INSERT
CREATE TRIGGER trigger_auto_generate_short_code
  AFTER INSERT ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_short_code();