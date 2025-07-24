import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url?: string;
  primary_color?: string;
  timezone?: string;
  tagline?: string;
  telegram_cta_enabled?: boolean;
  telegram_bot_token?: string;
  telegram_bot_username?: string;
  created_at: string;
  updated_at: string;
}

interface UserMembership {
  role: string;
  isUserInOrganization: boolean;
  allMemberships: Array<{
    organization_id: string;
    role: string;
    organization?: Organization;
  }>;
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
        .maybeSingle();

      if (error) {
        console.error('Database error during organization lookup:', error);
        throw new Error('Failed to load organization');
      }

      if (!org) {
        throw new Error('Organization not found');
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
      if (!user?.id) {
        return { role: '', isUserInOrganization: false, allMemberships: [] };
      }

      // Get user's membership for the specific organization if provided
      if (organizationId) {
        const { data: membership, error } = await supabase
          .from('user_organization_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No membership found for this org
            return { role: '', isUserInOrganization: false, allMemberships: [] };
          }
          console.error('Error fetching user membership:', error);
          throw new Error('Failed to check user membership');
        }

        // Also get all memberships for multi-org features
        const { data: allMemberships } = await supabase
          .from('user_organization_memberships')
          .select(`
            organization_id,
            role
          `)
          .eq('user_id', user.id);

        const formattedMemberships = (allMemberships || []).map(m => ({
          organization_id: m.organization_id,
          role: m.role
        }));

        return {
          role: membership.role,
          isUserInOrganization: true,
          allMemberships: formattedMemberships,
        };
      }

      // If no specific org requested, get all memberships
      const { data: allMemberships, error: allError } = await supabase
        .from('user_organization_memberships')
        .select(`
          organization_id,
          role
        `)
        .eq('user_id', user.id);

      if (allError) {
        console.error('Failed to fetch user memberships:', allError);
        return { role: '', isUserInOrganization: false, allMemberships: [] };
      }

      const formattedMemberships = (allMemberships || []).map(membership => ({
        organization_id: membership.organization_id,
        role: membership.role
      }));

      // Return the first membership if no specific org requested
      const firstMembership = formattedMemberships[0];
      return {
        role: firstMembership?.role || '',
        isUserInOrganization: formattedMemberships.length > 0,
        allMemberships: formattedMemberships,
      };
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}