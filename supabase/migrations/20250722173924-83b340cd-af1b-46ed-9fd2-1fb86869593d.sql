-- Fix infinite recursion in user_organization_memberships RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view memberships in their organizations" ON public.user_organization_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their organizations" ON public.user_organization_memberships;

-- Create security definer function to get user's admin organizations (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_admin_org_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(organization_id) 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  AND role = 'admin'::user_role;
$$;

-- Create new policies using the security definer function
CREATE POLICY "Admins can view memberships in their organizations" 
ON public.user_organization_memberships 
FOR SELECT 
USING (organization_id = ANY(public.get_user_admin_org_ids()));

CREATE POLICY "Admins can manage memberships in their organizations" 
ON public.user_organization_memberships 
FOR ALL 
USING (organization_id = ANY(public.get_user_admin_org_ids()))
WITH CHECK (organization_id = ANY(public.get_user_admin_org_ids()));