-- First, populate existing last_login data from auth.users
UPDATE public.user_profiles 
SET last_login = auth_users.last_sign_in_at
FROM auth.users auth_users
WHERE user_profiles.user_id = auth_users.id
AND auth_users.last_sign_in_at IS NOT NULL;

-- Update the trigger function to handle both new signups and existing users
CREATE OR REPLACE FUNCTION public.update_user_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update last_login for all profiles of this user
  UPDATE public.user_profiles
  SET last_login = COALESCE(NEW.last_sign_in_at, now())
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Also create a trigger for INSERT to handle new user signups
CREATE OR REPLACE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_login();

-- Update the existing trigger to be more reliable
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL)
  EXECUTE FUNCTION public.update_user_last_login();