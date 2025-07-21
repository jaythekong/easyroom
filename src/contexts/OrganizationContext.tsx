
import { createContext, useContext, ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationBySlug, useUserMembership } from "@/hooks/useOrganization";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  isUserInOrganization: boolean;
  userRole: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { loading: authLoading } = useAuth();
  
  // Use React Query hooks for better caching and error handling
  const { 
    data: organization, 
    isLoading: orgLoading, 
    error: orgError,
    isError: hasOrgError
  } = useOrganizationBySlug(orgSlug);

  const { 
    data: membership, 
    isLoading: membershipLoading,
    error: membershipError
  } = useUserMembership(organization?.id);

  // Determine loading state - be more conservative about showing loading
  const isLoading = useMemo(() => {
    // Only show loading if we don't have cached data and we're actually loading
    if (authLoading) return true;
    if (orgSlug && orgLoading && !organization) return true;
    if (organization?.id && membershipLoading && !membership) return true;
    return false;
  }, [authLoading, orgSlug, orgLoading, organization, membershipLoading, membership]);

  // Determine error state
  const error = useMemo(() => {
    if (hasOrgError) {
      return orgError?.message || 'Failed to load organization';
    }
    if (membershipError) {
      return 'Failed to verify access to organization';
    }
    return null;
  }, [hasOrgError, orgError, membershipError]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    organization: organization || null,
    isLoading,
    error,
    isUserInOrganization: membership?.isUserInOrganization || false,
    userRole: membership?.role || null,
  }), [organization, isLoading, error, membership]);

  console.log('OrganizationProvider: Context value:', {
    ...contextValue,
    orgSlug,
    hasOrganization: !!organization,
    hasMembership: !!membership
  });

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
