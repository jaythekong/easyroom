-- First, let's check if there are any user profiles for the current user in this organization
-- and create one if it doesn't exist

-- Insert a user profile for the authenticated user if one doesn't exist
-- This will help fix the "Unknown user" issue
INSERT INTO public.user_profiles (
  user_id,
  organization_id,
  role,
  email,
  display_name
)
SELECT 
  u.id as user_id,
  uom.organization_id,
  uom.role,
  u.email,
  u.raw_user_meta_data ->> 'display_name' as display_name
FROM auth.users u
JOIN public.user_organization_memberships uom ON uom.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up 
  WHERE up.user_id = u.id 
  AND up.organization_id = uom.organization_id
)
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Create a function to automatically create user profiles when users join organizations
CREATE OR REPLACE FUNCTION public.create_user_profile_on_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
  user_display_name TEXT;
BEGIN
  -- Get user information from auth.users
  SELECT 
    email,
    raw_user_meta_data ->> 'display_name'
  INTO user_email, user_display_name
  FROM auth.users 
  WHERE id = NEW.user_id;

  -- Create user profile for the new membership
  INSERT INTO public.user_profiles (
    user_id,
    organization_id,
    role,
    email,
    display_name
  ) VALUES (
    NEW.user_id,
    NEW.organization_id,
    NEW.role,
    user_email,
    user_display_name
  )
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profiles when memberships are created
DROP TRIGGER IF EXISTS create_user_profile_on_membership_trigger ON public.user_organization_memberships;
CREATE TRIGGER create_user_profile_on_membership_trigger
  AFTER INSERT ON public.user_organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile_on_membership();