-- Remove telegram_chat_id from organizations table as it's no longer needed
ALTER TABLE public.organizations DROP COLUMN telegram_chat_id;

-- Create telegram_subscriptions table to track user subscriptions
CREATE TABLE public.telegram_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, telegram_chat_id)
);

-- Enable RLS on telegram_subscriptions
ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram_subscriptions
CREATE POLICY "Admins can view subscriptions in their organization" 
ON public.telegram_subscriptions 
FOR SELECT 
USING (organization_id = get_user_organization_id() AND has_role('admin'::user_role));

CREATE POLICY "Admins can manage subscriptions in their organization" 
ON public.telegram_subscriptions 
FOR ALL 
USING (organization_id = get_user_organization_id() AND has_role('admin'::user_role))
WITH CHECK (organization_id = get_user_organization_id() AND has_role('admin'::user_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_telegram_subscriptions_updated_at
BEFORE UPDATE ON public.telegram_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();