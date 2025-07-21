-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile" 
ON user_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());