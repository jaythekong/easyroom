-- Update RLS policies to allow admins to manage all bookings in their organization

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;

-- Create new policies that allow admins to manage all bookings in their organization
CREATE POLICY "Users can update their own bookings or admins can update any booking in org"
ON public.bookings
FOR UPDATE
USING (
  (user_id = auth.uid() AND organization_id = get_user_organization_id()) OR 
  (organization_id = get_user_organization_id() AND has_role('admin'::user_role))
);

CREATE POLICY "Users can delete their own bookings or admins can delete any booking in org"
ON public.bookings
FOR DELETE
USING (
  (user_id = auth.uid() AND organization_id = get_user_organization_id()) OR 
  (organization_id = get_user_organization_id() AND has_role('admin'::user_role))
);