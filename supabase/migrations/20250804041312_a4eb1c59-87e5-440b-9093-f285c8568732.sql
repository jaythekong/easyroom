-- Clean up all data for user romneath.song@gmail.com
-- Delete user profiles
DELETE FROM user_profiles WHERE user_id = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';

-- Delete organization memberships
DELETE FROM user_organization_memberships WHERE user_id = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';

-- Delete any bookings (none found, but for completeness)
DELETE FROM bookings WHERE user_id = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';

-- Delete any telegram subscriptions
DELETE FROM telegram_subscriptions WHERE user_id = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';

-- Delete any invitations sent by this user
DELETE FROM invitations WHERE invited_by = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab' OR sent_by = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';

-- Delete from auth.users (this will cascade to related auth tables)
DELETE FROM auth.users WHERE id = '8dc14b13-d6fd-4df9-b8bf-f4397e2d7bab';