-- Fix RLS issue for organization creation
-- The problem is in the handle_org_creation trigger - it needs to handle cases where user might not exist

-- First, let's update the trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_org_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_exists BOOLEAN;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user ID is valid
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create organization: no authenticated user';
  END IF;
  
  -- Check if the user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = current_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Cannot create organization: user does not exist in auth.users';
  END IF;
  
  -- Insert a membership record making the creator an admin
  INSERT INTO public.user_organization_memberships (user_id, organization_id, role)
  VALUES (current_user_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$function$;