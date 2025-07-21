-- Drop the overly permissive policy and replace with secure one
DROP POLICY "Allow profile creation during signup" ON user_profiles;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());