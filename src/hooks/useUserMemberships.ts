import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserMembership {
  id: string;
  organization_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
    timezone?: string;
    tagline?: string;
  };
}

/**
 * Hook to get all organizations a user belongs to
 */
export function useUserMemberships() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['user-all-memberships', user?.id],
    queryFn: async (): Promise<UserMembership[]> => {
      if (!user?.id) {
        return [];
      }

      const { data: memberships, error } = await supabase
        .from('user_organization_memberships')
        .select(`
          id,
          organization_id,
          role,
          created_at,
          updated_at,
          organizations (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            timezone,
            tagline
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch user memberships:', error);
        throw new Error('Failed to fetch user memberships');
      }

      return (memberships || []).map(membership => ({
        id: membership.id,
        organization_id: membership.organization_id,
        role: membership.role,
        created_at: membership.created_at,
        updated_at: membership.updated_at,
        organization: {
          id: membership.organizations.id,
          name: membership.organizations.name,
          slug: membership.organizations.slug,
          logo_url: membership.organizations.logo_url,
          primary_color: membership.organizations.primary_color,
          timezone: membership.organizations.timezone,
          tagline: membership.organizations.tagline,
        }
      }));
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to check if user has a specific role in any organization
 */
export function useHasRole(requiredRole: string) {
  const { data: memberships = [] } = useUserMemberships();
  
  return memberships.some(membership => membership.role === requiredRole);
}

/**
 * Hook to get user's role in a specific organization
 */
export function useUserRoleInOrg(organizationId?: string) {
  const { data: memberships = [] } = useUserMemberships();
  
  if (!organizationId) return null;
  
  const membership = memberships.find(m => m.organization_id === organizationId);
  return membership?.role || null;
}

/**
 * Hook to get all organizations where user has admin role
 */
export function useAdminOrganizations() {
  const { data: memberships = [] } = useUserMemberships();
  
  return memberships
    .filter(membership => membership.role === 'admin')
    .map(membership => membership.organization);
}