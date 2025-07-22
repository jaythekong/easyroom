-- Modify the handle_org_creation function to ensure the user exists before creating organizations
DROP FUNCTION IF EXISTS public.handle_org_creation();

-- Create a function that handles organization creation by validating user existence first
CREATE OR REPLACE FUNCTION public.handle_org_creation()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- First check if the user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid()) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Cannot create organization: user does not exist';
  END IF;
  
  -- Insert a membership record making the creator an admin
  INSERT INTO public.user_organization_memberships (user_id, organization_id, role)
  VALUES (auth.uid(), NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';