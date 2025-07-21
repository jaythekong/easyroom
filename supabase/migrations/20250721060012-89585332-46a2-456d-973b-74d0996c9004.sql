-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'member');

-- Create user_profiles table (links auth.users to organizations)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to existing tables
ALTER TABLE public.rooms ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.amenities ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update existing data to belong to a default organization (temporary)
INSERT INTO public.organizations (name, slug) VALUES ('Default Organization', 'default-org');

UPDATE public.rooms SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default-org');
UPDATE public.amenities SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default-org');

-- Make organization_id required after updating existing data
ALTER TABLE public.rooms ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.amenities ALTER COLUMN organization_id SET NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- Create security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(required_role public.user_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$$;

-- Update RLS policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can manage their organization"
ON public.organizations
FOR ALL
USING (id = public.get_user_organization_id() AND public.has_role('admin'))
WITH CHECK (id = public.get_user_organization_id() AND public.has_role('admin'));

-- Update RLS policies for user_profiles
CREATE POLICY "Users can view profiles in their organization"
ON public.user_profiles
FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can manage profiles in their organization"
ON public.user_profiles
FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.has_role('admin'))
WITH CHECK (organization_id = public.get_user_organization_id() AND public.has_role('admin'));

-- Update RLS policies for rooms (replace existing policies)
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON public.rooms;

CREATE POLICY "Users can view active rooms in their organization"
ON public.rooms
FOR SELECT
USING (status = 'active'::room_status AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can manage rooms in their organization"
ON public.rooms
FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.has_role('admin'))
WITH CHECK (organization_id = public.get_user_organization_id() AND public.has_role('admin'));

-- Update RLS policies for amenities (replace existing policies)
DROP POLICY IF EXISTS "Anyone can view amenities" ON public.amenities;
DROP POLICY IF EXISTS "Authenticated users can manage amenities" ON public.amenities;

CREATE POLICY "Users can view amenities in their organization"
ON public.amenities
FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can manage amenities in their organization"
ON public.amenities
FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.has_role('admin'))
WITH CHECK (organization_id = public.get_user_organization_id() AND public.has_role('admin'));

-- Update RLS policies for room_amenities (replace existing policies)
DROP POLICY IF EXISTS "Anyone can view room amenities" ON public.room_amenities;
DROP POLICY IF EXISTS "Authenticated users can manage room amenities" ON public.room_amenities;

CREATE POLICY "Users can view room amenities in their organization"
ON public.room_amenities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id 
    AND organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Admins can manage room amenities in their organization"
ON public.room_amenities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id 
    AND organization_id = public.get_user_organization_id()
  ) AND public.has_role('admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id 
    AND organization_id = public.get_user_organization_id()
  ) AND public.has_role('admin')
);

-- Add triggers for timestamp updates on new tables
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();