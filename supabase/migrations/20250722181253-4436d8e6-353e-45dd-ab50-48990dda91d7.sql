-- Add missing user profile for soliyak@gmail.com in tunh org
INSERT INTO user_profiles (user_id, organization_id, email, role)
SELECT 
  uom.user_id,
  uom.organization_id,
  'soliyak@gmail.com',
  'admin'
FROM user_organization_memberships uom
JOIN organizations o ON o.id = uom.organization_id
WHERE uom.user_id = '5afd16cf-767c-465b-8d82-03f9d1010184'
AND o.slug = 'tunh'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles up 
  WHERE up.user_id = uom.user_id 
  AND up.organization_id = uom.organization_id
);