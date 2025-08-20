-- Fix storage RLS policies for welcome screen backgrounds
CREATE POLICY "Organizations can upload welcome backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'welcome-backgrounds'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_memberships 
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
    SELECT user_id FROM public.user_memberships 
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

-- Fix unique constraint issue by updating the upsert logic
-- The table already has the constraint, so we need to ensure proper conflict resolution