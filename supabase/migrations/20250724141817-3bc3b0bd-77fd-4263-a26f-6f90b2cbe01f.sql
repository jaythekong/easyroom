-- Allow NULL emails for link invitations
ALTER TABLE public.invitations ALTER COLUMN email DROP NOT NULL;