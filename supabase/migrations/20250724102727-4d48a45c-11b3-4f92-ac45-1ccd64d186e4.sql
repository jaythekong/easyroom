-- Fix the public access policy for invitations to allow short code lookup
DROP POLICY IF EXISTS "Public can view minimal invite fields" ON public.invitations;

-- Create a proper policy that allows public users to look up invitations by short code
CREATE POLICY "Public can view invitations by short code"
ON public.invitations
FOR SELECT
TO public
USING (
  -- Only allow access to pending, non-expired invitations
  status = 'pending' 
  AND accepted_at IS NULL 
  AND revoked_at IS NULL 
  AND expires_at > now()
);