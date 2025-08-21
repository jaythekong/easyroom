-- Create demo configuration table
CREATE TABLE public.demo_configuration (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  demo_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(demo_organization_id)
);

-- Enable Row Level Security
ALTER TABLE public.demo_configuration ENABLE ROW LEVEL SECURITY;

-- Create policies for demo configuration
CREATE POLICY "Super admins can manage demo configuration" 
ON public.demo_configuration 
FOR ALL 
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'super_admin'::text)::boolean = true)
WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'super_admin'::text)::boolean = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_demo_configuration_updated_at
BEFORE UPDATE ON public.demo_configuration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();