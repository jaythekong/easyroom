import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  created_at: string;
  updated_at: string;
}

interface UserMembership {
  role: string;
  isUserInOrganization: boolean;
}

export function useOrganizationBySlug(orgSlug: string | undefined) {
  return useQuery({
    queryKey: ['organization', orgSlug],
    queryFn: async () => {
      if (!orgSlug) return null;
      
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Organization not found');
        }
        throw new Error('Failed to load organization');
      }

      return org as Organization;
    },
    enabled: !!orgSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes - organizations don't change often
    retry: (failureCount, error: any) => {
      // Don't retry if organization not found
      if (error?.message === 'Organization not found') return false;
      return failureCount < 2;
    },
  });
}

export function useUserMembership(organizationId: string | undefined) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['user-membership', organizationId, user?.id],
    queryFn: async (): Promise<UserMembership> => {
      if (!organizationId || !user?.id) {
        return { role: '', isUserInOrganization: false };
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { role: '', isUserInOrganization: false };
        }
        throw new Error('Failed to check user membership');
      }

      return {
        role: profile.role,
        isUserInOrganization: true,
      };
    },
    enabled: !!organizationId && !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}