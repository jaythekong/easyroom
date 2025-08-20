-- Fix storage RLS policies for welcome screen backgrounds (using correct table name)
CREATE POLICY "Organizations can upload welcome backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_organization_memberships 
    WHERE organization_id::text = (storage.foldername(name))[2]
    AND role IN ('admin', 'owner')
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
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Public can view welcome backgrounds" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
);