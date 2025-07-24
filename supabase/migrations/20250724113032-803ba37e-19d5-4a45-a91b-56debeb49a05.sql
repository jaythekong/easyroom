-- Fix search path for has_telegram_sub function
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