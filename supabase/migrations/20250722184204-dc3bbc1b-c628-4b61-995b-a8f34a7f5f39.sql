-- Drop the existing restrictive policy for user memberships
DROP POLICY IF EXISTS "Allow first membership creation during signup" ON public.user_organization_memberships;

-- Create new policy that allows users to create their own memberships in any organization
CREATE POLICY "Users can create their own memberships" 
ON public.user_organization_memberships 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Update the function that handles organization creation to automatically make the creator an admin
CREATE OR REPLACE FUNCTION public.handle_org_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a membership record making the creator an admin
  INSERT INTO public.user_organization_memberships (user_id, organization_id, role)
  VALUES (auth.uid(), NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create a trigger to automatically make the creator an admin when a new organization is created
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_org_creation();