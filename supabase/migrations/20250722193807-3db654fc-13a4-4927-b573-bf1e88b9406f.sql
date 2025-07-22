-- Clean up joonaak organization and related data completely
BEGIN;

-- Delete user profiles for joonaak organization
DELETE FROM user_profiles 
WHERE organization_id = '80d8c4e8-1a32-4e9b-b4c2-bfdbabf82df7';

-- Delete user organization memberships for joonaak organization
DELETE FROM user_organization_memberships 
WHERE organization_id = '80d8c4e8-1a32-4e9b-b4c2-bfdbabf82df7';

-- Delete any bookings for joonaak organization
DELETE FROM bookings 
WHERE organization_id = '80d8c4e8-1a32-4e9b-b4c2-bfdbabf82df7';

-- Delete the joonaak organization itself
DELETE FROM organizations 
WHERE id = '80d8c4e8-1a32-4e9b-b4c2-bfdbabf82df7';

COMMIT;