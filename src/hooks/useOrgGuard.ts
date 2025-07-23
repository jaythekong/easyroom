import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type OrgGuardStatus = 'loading' | 'authorized' | 'unauthorized' | 'not_found' | 'suspended';

export interface OrgGuardResult {
  status: OrgGuardStatus;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  userRole?: 'admin' | 'member';
  error?: string;
}

export function useOrgGuard(orgSlug: string): OrgGuardResult {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['org-guard', orgSlug, user?.id],
    queryFn: async (): Promise<OrgGuardResult> => {
      if (!user) {
        return { status: 'unauthorized', error: 'User not authenticated' };
      }

      // First, check if the organization exists and get its status
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, status')
        .eq('slug', orgSlug)
        .maybeSingle();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        return { status: 'not_found', error: 'Failed to fetch organization' };
      }

      if (!org) {
        return { status: 'not_found', error: 'Organization not found' };
      }

      // Check if organization is suspended
      if (org.status === 'suspended') {
        return { 
          status: 'suspended', 
          organization: { id: org.id, name: org.name, slug: org.slug },
          error: 'This organization has been suspended' 
        };
      }

      // Then check if user has membership in this organization
      const { data: membership, error: membershipError } = await supabase
        .from('user_organization_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', org.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error checking membership:', membershipError);
        return { status: 'unauthorized', error: 'Failed to check membership' };
      }

      if (!membership) {
        return { 
          status: 'unauthorized', 
          organization: { id: org.id, name: org.name, slug: org.slug },
          error: 'User is not a member of this organization' 
        };
      }

      return { 
        status: 'authorized', 
        organization: { id: org.id, name: org.name, slug: org.slug },
        userRole: membership.role as 'admin' | 'member'
      };
    },
    enabled: !authLoading && !!user && !!orgSlug,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (authLoading || isLoading) {
    return { status: 'loading' };
  }

  if (error) {
    console.error('useOrgGuard error:', error);
    return { status: 'unauthorized', error: error.message };
  }

  return data || { status: 'loading' };
}