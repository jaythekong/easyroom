-- Function to set super admin claim for a user
CREATE OR REPLACE FUNCTION public.set_user_super_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Update the user's raw_app_meta_data to include super_admin claim
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('super_admin', true)
  WHERE id = user_id;
  
  RETURN 'Successfully granted super admin access to: ' || user_email;
END;
$$;

-- Grant execute permission to authenticated users (for now, will remove later)
GRANT EXECUTE ON FUNCTION public.set_user_super_admin(TEXT) TO authenticated;

-- Also create a function to remove super admin access
CREATE OR REPLACE FUNCTION public.remove_user_super_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Remove super_admin from raw_app_meta_data
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) - 'super_admin'
  WHERE id = user_id;
  
  RETURN 'Successfully removed super admin access from: ' || user_email;
END;
$$;