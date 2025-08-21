-- Fix remaining database functions that still need search_path hardening

-- Update update_user_last_login function
CREATE OR REPLACE FUNCTION public.update_user_last_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update last_login for all profiles of this user
  UPDATE public.user_profiles
  SET last_login = COALESCE(NEW.last_sign_in_at, now())
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Update handle_org_creation function
CREATE OR REPLACE FUNCTION public.handle_org_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update create_user_profile_on_membership function
CREATE OR REPLACE FUNCTION public.create_user_profile_on_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update set_user_super_admin function
CREATE OR REPLACE FUNCTION public.set_user_super_admin(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update remove_user_super_admin function
CREATE OR REPLACE FUNCTION public.remove_user_super_admin(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update update_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;