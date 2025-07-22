-- Add missing membership for soliyak@gmail.com to tunh organization
INSERT INTO public.user_organization_memberships (user_id, organization_id, role)
SELECT 
  '5afd16cf-767c-465b-8d82-03f9d1010184'::uuid as user_id,
  o.id as organization_id,
  'admin'::user_role as role
FROM public.organizations o
WHERE o.slug = 'tunh'
AND NOT EXISTS (
  SELECT 1 FROM public.user_organization_memberships uom 
  WHERE uom.user_id = '5afd16cf-767c-465b-8d82-03f9d1010184' 
  AND uom.organization_id = o.id
);