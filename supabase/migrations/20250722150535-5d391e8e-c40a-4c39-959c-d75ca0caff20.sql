-- Delete all member user profiles and their associated auth records
-- This will keep only admin users in the system

-- First, delete all bookings made by member users to avoid foreign key violations
DELETE FROM public.bookings 
WHERE user_id IN (
  SELECT user_id FROM public.user_profiles 
  WHERE role = 'member'
);

-- Delete all invitations made by member users
DELETE FROM public.invitations 
WHERE invited_by IN (
  SELECT user_id FROM public.user_profiles 
  WHERE role = 'member'
);

-- Delete all telegram subscriptions for member users
DELETE FROM public.telegram_subscriptions 
WHERE user_id IN (
  SELECT user_id FROM public.user_profiles 
  WHERE role = 'member'
);

-- Delete all room downtime records created by member users
DELETE FROM public.room_downtime 
WHERE user_id IN (
  SELECT user_id FROM public.user_profiles 
  WHERE role = 'member'
);

-- Store member user IDs for auth deletion
CREATE TEMP TABLE member_user_ids AS (
  SELECT user_id FROM public.user_profiles 
  WHERE role = 'member'
);

-- Delete member user profiles
DELETE FROM public.user_profiles 
WHERE role = 'member';

-- Note: Auth user deletion needs to be done through the admin API
-- The auth.users records for members will need to be cleaned up separately