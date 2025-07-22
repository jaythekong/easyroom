-- Create user_organization_memberships table for many-to-many relationships
CREATE TABLE public.user_organization_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure unique user-org combinations
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on new table
ALTER TABLE public.user_organization_memberships ENABLE ROW LEVEL SECURITY;

-- Migrate existing data from user_profiles to memberships table
INSERT INTO public.user_organization_memberships (user_id, organization_id, role, created_at, updated_at)
SELECT 
  user_id, 
  organization_id, 
  role,
  created_at,
  updated_at
FROM public.user_profiles
WHERE organization_id IS NOT NULL;

-- Create RLS policies for memberships table
CREATE POLICY "Users can view their own memberships" 
ON public.user_organization_memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view memberships in their organizations" 
ON public.user_organization_memberships 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage memberships in their organizations" 
ON public.user_organization_memberships 
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create updated security definer functions
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(organization_id) 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
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
AS $$
  SELECT role 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  AND organization_id = org_id;
$$;

-- Update trigger for timestamp updates
CREATE TRIGGER update_user_organization_memberships_updated_at
BEFORE UPDATE ON public.user_organization_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing RLS policies to work with multiple orgs
-- For now, keep the old get_user_organization_id() function for backward compatibility
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Return the first organization (for backward compatibility)
  SELECT organization_id 
  FROM public.user_organization_memberships 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;

-- Update has_role function to work with memberships
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_memberships 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$$;