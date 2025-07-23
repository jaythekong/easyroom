-- Check current RLS policies on organizations table
-- and fix them to work with multi-organization setup

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

-- Create new policy that allows admins to update organizations they belong to
CREATE POLICY "Admins can update organizations they belong to" 
ON public.organizations 
FOR UPDATE 
USING (has_role_in_org('admin'::user_role, id))
WITH CHECK (has_role_in_org('admin'::user_role, id));

-- Allow viewing organizations (for the settings page to load)
CREATE POLICY "Admins can view organizations they belong to" 
ON public.organizations 
FOR SELECT 
USING (has_role_in_org('admin'::user_role, id) OR true);