-- Fix rooms RLS policy to support multi-organization users
DROP POLICY IF EXISTS "Users can view active rooms in their organization" ON rooms;

CREATE POLICY "Users can view active rooms in their organizations" 
ON rooms 
FOR SELECT 
USING (
  status = 'active'::room_status 
  AND organization_id = ANY (get_user_organization_ids())
);