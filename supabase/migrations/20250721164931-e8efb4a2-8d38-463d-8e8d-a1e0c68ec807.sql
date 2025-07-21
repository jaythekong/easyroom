-- Allow public access to invitations by token for signup process
-- This is needed because users accessing invite links are not yet authenticated
CREATE POLICY "Public can view invitations by token" 
ON invitations 
FOR SELECT 
TO public
USING (invite_token IS NOT NULL);