
import { createContext, useContext, ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationBySlug, useUserMembership } from "@/hooks/useOrganization";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

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
  
  // Use React Query hooks for better caching and error handling
  const orgQuery = useOrganizationBySlug(orgSlug);
  const membershipQuery = useUserMembership(orgQuery.data?.id);

  // Update favicon when organization changes
  useDynamicFavicon(orgQuery.data);

  // Enhanced context value with multi-org support
  const contextValue = useMemo(() => ({
    organization: orgQuery.data || null,
    isLoading: orgQuery.isLoading || membershipQuery.isLoading,
    error: orgQuery.error?.message || membershipQuery.error?.message || null,
    isUserInOrganization: membershipQuery.data?.isUserInOrganization || false,
    userRole: membershipQuery.data?.role || null,
    orgSlug,
    hasOrganization: !!orgQuery.data,
    hasMembership: membershipQuery.data?.isUserInOrganization || false,
    // Multi-org features
    allUserMemberships: membershipQuery.data?.allMemberships || [],
    hasAdminAccess: membershipQuery.data?.role === 'admin',
    canSwitchOrganizations: (membershipQuery.data?.allMemberships?.length || 0) > 1,
  }), [
    orgQuery.data?.id, 
    orgQuery.data?.name, 
    orgQuery.data?.slug,
    orgQuery.isLoading, 
    orgQuery.error?.message, 
    membershipQuery.data?.isUserInOrganization,
    membershipQuery.data?.role,
    membershipQuery.data?.allMemberships?.length,
    membershipQuery.isLoading, 
    membershipQuery.error?.message, 
    orgSlug
  ]);

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
