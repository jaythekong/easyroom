-- Fix RLS policy for rooms table to work with multi-organization setup
DROP POLICY IF EXISTS "Admins can manage rooms in their organization" ON public.rooms;

-- Create new policy that checks admin role in the specific organization
CREATE POLICY "Admins can manage rooms in their organization" 
ON public.rooms 
FOR ALL 
USING (has_role_in_org('admin'::user_role, organization_id))
WITH CHECK (has_role_in_org('admin'::user_role, organization_id));