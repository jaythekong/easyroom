-- Create user profile for existing users
-- This ensures existing users can access the system after multi-tenancy migration

INSERT INTO public.user_profiles (user_id, organization_id, role)
SELECT 
  u.id as user_id,
  o.id as organization_id,
  'admin'::user_role as role
FROM auth.users u
CROSS JOIN public.organizations o
WHERE o.slug = 'default-org'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.user_id = u.id
  );