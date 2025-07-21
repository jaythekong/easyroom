-- Add customization fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN logo_url TEXT,
ADD COLUMN primary_color TEXT DEFAULT '#ea580c';

-- Update the trigger to handle the new columns
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();