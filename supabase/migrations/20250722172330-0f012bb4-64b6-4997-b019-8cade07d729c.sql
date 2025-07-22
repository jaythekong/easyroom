-- Fix security warnings by setting search_path on all functions

CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(organization_id) 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(required_role user_role, org_id UUID DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() 
    AND role = required_role
    AND (org_id IS NULL OR organization_id = org_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_org(org_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  AND organization_id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Return the first organization (for backward compatibility)
  SELECT organization_id 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$$;

-- Also fix the existing update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;