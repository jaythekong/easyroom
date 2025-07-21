-- Create policies for organization logo uploads in avatars bucket
CREATE POLICY "Organization logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars' AND name LIKE 'logos/%');

CREATE POLICY "Admins can upload organization logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE 'logos/%'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update organization logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'logos/%'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete organization logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'logos/%'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);