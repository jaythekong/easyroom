import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  timezone?: string;
  tagline?: string;
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
      if (!user?.id) {
        return { role: '', isUserInOrganization: false, allMemberships: [] };
      }

      // Get all user memberships
      const { data: allMemberships, error: allError } = await supabase
        .from('user_organization_memberships')
        .select(`
          organization_id,
          role,
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
        .eq('user_id', user.id);

      if (allError) {
        console.error('Failed to fetch user memberships:', allError);
        return { role: '', isUserInOrganization: false, allMemberships: [] };
      }

      // Format the memberships data
      const formattedMemberships = (allMemberships || []).map(membership => ({
        organization_id: membership.organization_id,
        role: membership.role,
        organization: membership.organizations ? {
          id: membership.organizations.id,
          name: membership.organizations.name,
          slug: membership.organizations.slug,
          logo_url: membership.organizations.logo_url,
          primary_color: membership.organizations.primary_color,
          timezone: membership.organizations.timezone,
          tagline: membership.organizations.tagline,
          created_at: '', // These aren't selected but needed for type compatibility
          updated_at: ''
        } : undefined
      }));

      // Find membership for specific organization if provided
      if (organizationId) {
        const specificMembership = formattedMemberships.find(
          m => m.organization_id === organizationId
        );
        
        return {
          role: specificMembership?.role || '',
          isUserInOrganization: !!specificMembership,
          allMemberships: formattedMemberships,
        };
      }

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