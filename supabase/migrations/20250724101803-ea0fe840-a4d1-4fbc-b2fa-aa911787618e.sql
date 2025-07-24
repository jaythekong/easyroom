-- Fix missing short codes for existing invitations
UPDATE invitations 
SET short_code = UPPER(
  SUBSTRING(MD5(RANDOM()::text || invite_token::text) FROM 1 FOR 8)
)
WHERE short_code IS NULL AND accepted_at IS NULL;