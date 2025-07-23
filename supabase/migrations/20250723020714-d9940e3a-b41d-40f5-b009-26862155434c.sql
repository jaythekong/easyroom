-- Fix RLS policies for bookings table to work with multi-organization setup
DROP POLICY IF EXISTS "Users can create bookings in their organization" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings in their organization" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings or admins can update any bo" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings or admins can delete any bo" ON public.bookings;

-- Create new policies that check membership in the specific organization
CREATE POLICY "Users can view bookings in organizations they belong to" 
ON public.bookings 
FOR SELECT 
USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Users can create bookings in organizations they belong to" 
ON public.bookings 
FOR INSERT 
WITH CHECK (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Users can update their own bookings or admins can update bookings in their organizations" 
ON public.bookings 
FOR UPDATE 
USING (
  (user_id = auth.uid() AND organization_id = ANY(get_user_organization_ids())) 
  OR has_role_in_org('admin'::user_role, organization_id)
);

CREATE POLICY "Users can delete their own bookings or admins can delete bookings in their organizations" 
ON public.bookings 
FOR DELETE 
USING (
  (user_id = auth.uid() AND organization_id = ANY(get_user_organization_ids())) 
  OR has_role_in_org('admin'::user_role, organization_id)
);