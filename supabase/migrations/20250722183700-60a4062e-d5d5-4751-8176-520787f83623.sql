-- Drop the existing restrictive policy for organization creation
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create new policy that allows existing users to create more organizations
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add an explicit policy for admins to update their own organizations
CREATE POLICY "Admins can update their organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING ((id = get_user_organization_id()) AND has_role('admin'::user_role))
WITH CHECK ((id = get_user_organization_id()) AND has_role('admin'::user_role));