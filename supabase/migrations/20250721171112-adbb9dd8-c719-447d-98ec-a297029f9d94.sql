-- Add email field to user_profiles table
ALTER TABLE user_profiles ADD COLUMN email TEXT;

-- Update existing user profile with actual email
UPDATE user_profiles 
SET email = 'andywong.malis@gmail.com' 
WHERE user_id = '5b4121ea-81d7-4c08-97b9-e03934516857';