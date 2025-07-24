-- Create helper RPC to check if user has telegram subscription
CREATE OR REPLACE FUNCTION public.has_telegram_sub(
  p_user uuid,
  p_org uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM telegram_subscriptions
    WHERE user_id = p_user
      AND organization_id = p_org
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_telegram_sub(uuid, uuid) TO authenticated;

-- Add optional org toggle for telegram CTA
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS telegram_cta_enabled boolean DEFAULT true;