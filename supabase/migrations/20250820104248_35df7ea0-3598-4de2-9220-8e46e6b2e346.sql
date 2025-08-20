-- Add last_login column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN last_login timestamp with time zone;

-- Create function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update last_login for all profiles of this user
  UPDATE public.user_profiles
  SET last_login = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update last_login on auth.users updates (when last_sign_in_at changes)
CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_user_last_login();