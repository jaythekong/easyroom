-- Fix RLS policies for invitations table to work with multi-organization setup

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage invitations in their organization" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations in their organization" ON public.invitations;

-- Create updated policies that work with multi-organization setup
CREATE POLICY "Admins can manage invitations in their organizations" 
ON public.invitations 
FOR ALL 
USING (organization_id = ANY (get_user_admin_org_ids()))
WITH CHECK (organization_id = ANY (get_user_admin_org_ids()));

CREATE POLICY "Users can view invitations in their organizations" 
ON public.invitations 
FOR SELECT 
USING (organization_id = ANY (get_user_organization_ids()));