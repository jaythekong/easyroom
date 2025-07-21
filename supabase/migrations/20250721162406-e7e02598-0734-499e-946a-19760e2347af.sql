-- Allow anyone to view organization basic info by slug (needed for multi-tenant routing)
-- This enables users to access organization pages even if they're not members yet
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Allow viewing organizations by slug" ON organizations;

-- Create a more permissive policy for viewing organizations
CREATE POLICY "Allow viewing organizations by slug" 
ON organizations 
FOR SELECT 
TO public
USING (true);

-- Keep the admin policy as is
-- Admins can manage their organization policy already exists