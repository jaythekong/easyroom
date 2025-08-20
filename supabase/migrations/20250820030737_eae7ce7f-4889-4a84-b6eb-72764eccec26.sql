-- Fix storage RLS policies for welcome screen backgrounds (using only valid roles)
CREATE POLICY "Organizations can upload welcome backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_organization_memberships 
    WHERE organization_id::text = (storage.foldername(name))[2]
    AND role = 'admin'
  )
);

CREATE POLICY "Organizations can update welcome backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_organization_memberships 
    WHERE organization_id::text = (storage.foldername(name))[2]
    AND role = 'admin'
  )
);

CREATE POLICY "Public can view welcome backgrounds" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
);