-- Add RLS policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (user_id = auth.uid());