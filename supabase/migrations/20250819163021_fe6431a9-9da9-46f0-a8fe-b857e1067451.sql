-- Add frequency column to ticker_messages table
ALTER TABLE public.ticker_messages ADD COLUMN frequency INTEGER DEFAULT 1;

-- Add comment to explain frequency
COMMENT ON COLUMN public.ticker_messages.frequency IS 'How often this message appears in the ticker rotation (1=normal, 2=twice as often, etc.)';