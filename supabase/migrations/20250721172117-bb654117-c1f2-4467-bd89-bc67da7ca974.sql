-- Add unique constraint to user_id in user_profiles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Now add foreign key relationship between bookings and user_profiles
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id);