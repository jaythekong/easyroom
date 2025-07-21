-- Fix invitation RLS policies to not access auth.users table
-- Drop the problematic policy that tries to access auth.users
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON invitations;

-- Create a simpler policy that only allows viewing invitations in the user's organization
-- We'll handle email matching in the application layer instead
CREATE POLICY "Users can view invitations in their organization" 
ON invitations 
FOR SELECT 
USING (organization_id = get_user_organization_id());