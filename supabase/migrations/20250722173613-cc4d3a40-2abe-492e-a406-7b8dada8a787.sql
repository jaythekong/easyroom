-- Fix organization creation RLS policy to allow users to create their first organization
DROP POLICY IF EXISTS "Admins can manage their organization" ON public.organizations;

-- Allow users to create organizations if they don't have any memberships yet
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.user_organization_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to manage their existing organization
CREATE POLICY "Admins can manage their organization" 
ON public.organizations 
FOR ALL 
USING ((id = get_user_organization_id()) AND has_role('admin'::user_role))
WITH CHECK ((id = get_user_organization_id()) AND has_role('admin'::user_role));