-- Fix user_profiles SELECT policy to handle multi-org and new org creation
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.user_profiles;

-- Allow users to view profiles in any organization they belong to
CREATE POLICY "Users can view profiles in organizations they belong to" 
ON public.user_profiles 
FOR SELECT 
USING (
  organization_id = ANY(get_user_organization_ids()) 
  OR user_id = auth.uid() -- Always allow users to see their own profiles
);