-- Add recipient_name field to invitations table for tracking who the invite is intended for
ALTER TABLE public.invitations 
ADD COLUMN recipient_name TEXT;

COMMENT ON COLUMN public.invitations.recipient_name IS 'Name of the person this invitation is intended for (for tracking purposes)';