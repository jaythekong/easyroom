-- First drop the dependent foreign key constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

-- Remove the incorrect unique constraint that prevents multi-org profiles  
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_id_unique;

-- Add correct unique constraint for user_id + organization_id combination
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_org_unique UNIQUE (user_id, organization_id);

-- Create a new foreign key constraint that references user_id only (since bookings has user_id and organization_id)
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);