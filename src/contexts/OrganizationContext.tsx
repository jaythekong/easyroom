
import { createContext, useContext, ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrgAndMembership } from "@/hooks/useOrgAndMembership";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url?: string;
  primary_color?: string;
  timezone?: string;
  tagline?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  isUserInOrganization: boolean;
  userRole: string | null;
  orgSlug: string | undefined;
  hasOrganization: boolean;
  hasMembership: boolean;
  // Multi-org support
  allUserMemberships: Array<{
    organization_id: string;
    role: string;
    organization?: Organization;
  }>;
  hasAdminAccess: boolean;
  canSwitchOrganizations: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { loading: authLoading } = useAuth();
  
  // Use unified hook for better sequencing
  const { org, membership, loading, error, role, isMember, isAdmin } = useOrgAndMembership(orgSlug);

  // Enhanced context value with multi-org support
  const contextValue = useMemo(() => ({
    organization: org || null,
    isLoading: loading,
    error: error?.message || null,
    isUserInOrganization: isMember,
    userRole: role,
    orgSlug,
    hasOrganization: !!org,
    hasMembership: isMember,
    // Multi-org features
    allUserMemberships: membership?.allMemberships || [],
    hasAdminAccess: isAdmin,
    canSwitchOrganizations: (membership?.allMemberships?.length || 0) > 1,
  }), [org, loading, error, isMember, role, orgSlug, membership, isAdmin]);

  console.log('OrganizationProvider: Context value:', {
    organization: contextValue.organization?.name,
    isLoading: contextValue.isLoading,
    error: contextValue.error,
    isUserInOrganization: contextValue.isUserInOrganization,
    userRole: contextValue.userRole,
    orgSlug: contextValue.orgSlug,
    hasOrganization: contextValue.hasOrganization,
    hasMembership: contextValue.hasMembership,
    membershipCount: contextValue.allUserMemberships?.length || 0
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
