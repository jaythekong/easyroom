-- Add policy to allow creation of first organization membership
CREATE POLICY "Allow first membership creation during signup"
ON public.user_organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM user_organization_memberships
    WHERE user_id = auth.uid()
  )
);