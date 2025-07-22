-- Fix user_profiles RLS policy to allow profile creation during organization setup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Allow users to insert their own profile for any organization
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Also ensure users can create profiles when joining organizations via invitations
-- Update the admin policy to not conflict
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.user_profiles;

CREATE POLICY "Admins can manage profiles in their organization" 
ON public.user_profiles 
FOR UPDATE, DELETE
USING (has_role_in_org('admin'::user_role, organization_id));