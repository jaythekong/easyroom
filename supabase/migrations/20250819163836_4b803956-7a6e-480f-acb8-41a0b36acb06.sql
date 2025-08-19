-- Create ticker_settings table for organization-level ticker configuration
CREATE TABLE public.ticker_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  master_speed INTEGER DEFAULT 50 CHECK (master_speed >= 10 AND master_speed <= 200),
  message_spacing INTEGER DEFAULT 8 CHECK (message_spacing >= 0 AND message_spacing <= 20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticker_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage ticker settings in their organization" 
ON public.ticker_settings 
FOR ALL 
USING (organization_id IN (
  SELECT organization_id 
  FROM user_organization_memberships 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
))
WITH CHECK (organization_id IN (
  SELECT organization_id 
  FROM user_organization_memberships 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Users can view ticker settings in their organization" 
ON public.ticker_settings 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id 
  FROM user_organization_memberships 
  WHERE user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ticker_settings_updated_at
BEFORE UPDATE ON public.ticker_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove speed column from ticker_messages as we'll use master speed
ALTER TABLE public.ticker_messages DROP COLUMN IF EXISTS speed;