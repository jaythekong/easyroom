-- Create function to get user memberships with organization details
CREATE OR REPLACE FUNCTION public.get_user_memberships(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  role user_role,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  organizations JSONB
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    uom.id,
    uom.organization_id,
    uom.role,
    uom.created_at,
    uom.updated_at,
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'logo_url', o.logo_url,
      'primary_color', o.primary_color,
      'timezone', o.timezone,
      'tagline', o.tagline
    ) as organizations
  FROM public.user_organization_memberships uom
  JOIN public.organizations o ON o.id = uom.organization_id
  WHERE uom.user_id = p_user_id
  ORDER BY uom.created_at ASC;
$$;