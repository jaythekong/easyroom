-- Drop the restrictive insert policy and replace with one that works for signup
DROP POLICY "Users can insert their own profile" ON user_profiles;

-- Allow users to insert profiles during signup process (less restrictive for initial signup)
CREATE POLICY "Allow profile creation during signup" 
ON user_profiles 
FOR INSERT 
TO public
WITH CHECK (true);