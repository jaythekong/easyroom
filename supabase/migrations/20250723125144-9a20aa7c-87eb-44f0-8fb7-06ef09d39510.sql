-- Remove the incorrect unique constraint that prevents multi-org profiles
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_id_unique;

-- Add correct unique constraint for user_id + organization_id combination
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_org_unique UNIQUE (user_id, organization_id);

-- Update the foreign key constraint to reference the correct unique constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_org_fkey 
FOREIGN KEY (user_id, organization_id) REFERENCES user_profiles(user_id, organization_id);