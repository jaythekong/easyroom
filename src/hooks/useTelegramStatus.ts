import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useTelegramStatus(orgId: string) {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['telegram', session?.user?.id, orgId],
    queryFn: async () => {
      if (!session?.user?.id || !orgId) return false;
      
      const { data, error } = await supabase.rpc('has_telegram_sub', {
        p_user: session.user.id,
        p_org: orgId
      });
      
      if (error) {
        console.error('Error checking telegram status:', error);
        return false;
      }
      
      return data;
    },
    enabled: !!session?.user && !!orgId,
    staleTime: 60_000, // 1 minute
  });
}