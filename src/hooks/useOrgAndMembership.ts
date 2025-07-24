import { useOrganizationBySlug, useUserMembership } from './useOrganization';

export function useOrgAndMembership(slug: string | undefined) {
  const orgQuery = useOrganizationBySlug(slug);                // gets org row
  const membershipQuery = useUserMembership(orgQuery.data?.id); // waits for orgId

  const loading = orgQuery.isLoading || membershipQuery.isLoading;
  const error = orgQuery.error || membershipQuery.error;

  return {
    loading,
    error,
    org: orgQuery.data,
    membership: membershipQuery.data,
    role: membershipQuery.data?.role || null,
    isMember: membershipQuery.data?.isUserInOrganization || false,
    isAdmin: membershipQuery.data?.role === 'admin',
  };
}