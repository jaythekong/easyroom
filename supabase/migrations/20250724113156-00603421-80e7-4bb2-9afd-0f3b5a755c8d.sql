-- Add telegram_bot_username column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS telegram_bot_username text;