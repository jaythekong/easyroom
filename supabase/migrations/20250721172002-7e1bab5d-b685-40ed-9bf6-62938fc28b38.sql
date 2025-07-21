-- Add foreign key relationship between bookings and user_profiles
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id);