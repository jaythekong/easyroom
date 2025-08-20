-- Create welcome screen settings table
CREATE TABLE public.welcome_screen_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  welcome_text TEXT NOT NULL DEFAULT 'Welcome!',
  background_type TEXT NOT NULL DEFAULT 'gradient' CHECK (background_type IN ('gradient', 'image', 'color')),
  background_value TEXT NOT NULL DEFAULT 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  font_size TEXT NOT NULL DEFAULT 'text-6xl',
  animation_enabled BOOLEAN NOT NULL DEFAULT true,
  animation_type TEXT NOT NULL DEFAULT 'floating' CHECK (animation_type IN ('floating', 'pulse', 'fade', 'slide')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable Row Level Security
ALTER TABLE public.welcome_screen_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for welcome screen settings
CREATE POLICY "Users can view welcome screen settings in their organization" 
ON public.welcome_screen_settings 
FOR SELECT 
USING (organization_id = ANY (get_user_organization_ids()));

CREATE POLICY "Admins can manage welcome screen settings in their organization" 
ON public.welcome_screen_settings 
FOR ALL 
USING (has_role_in_org('admin'::user_role, organization_id))
WITH CHECK (has_role_in_org('admin'::user_role, organization_id));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_welcome_screen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_welcome_screen_settings_updated_at
BEFORE UPDATE ON public.welcome_screen_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_welcome_screen_updated_at();