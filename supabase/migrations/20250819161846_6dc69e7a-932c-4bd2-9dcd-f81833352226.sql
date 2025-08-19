-- Create ticker_messages table for customizable home page ticker
CREATE TABLE public.ticker_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT DEFAULT '📢',
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  background_color TEXT DEFAULT '#3B82F6',
  text_color TEXT DEFAULT '#FFFFFF',
  speed INTEGER DEFAULT 50, -- pixels per second
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ticker_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for ticker messages
CREATE POLICY "Users can view their organization's ticker messages" 
ON public.ticker_messages 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage ticker messages" 
ON public.ticker_messages 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_ticker_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ticker_messages_updated_at
  BEFORE UPDATE ON public.ticker_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticker_messages_updated_at();

-- Add some example data
INSERT INTO public.ticker_messages (organization_id, message, emoji, order_index) VALUES
('cf47d6a7-e2f6-4ba4-b0f4-4ff65ffc5277', 'Welcome to our room booking system!', '🎉', 1),
('cf47d6a7-e2f6-4ba4-b0f4-4ff65ffc5277', 'Book your meeting rooms instantly', '⚡', 2),
('cf47d6a7-e2f6-4ba4-b0f4-4ff65ffc5277', 'Need help? Contact our support team', '💬', 3);