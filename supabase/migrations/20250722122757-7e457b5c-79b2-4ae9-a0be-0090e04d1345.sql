-- Add telegram_bot_token field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN telegram_bot_token TEXT;

-- Add telegram_chat_id field to organizations table for notifications
ALTER TABLE public.organizations 
ADD COLUMN telegram_chat_id TEXT;