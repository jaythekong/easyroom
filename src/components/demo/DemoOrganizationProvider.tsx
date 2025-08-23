import React, { createContext, useContext } from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

// Import the real OrganizationContext to provide the same interface
const OrganizationContext = React.createContext<any>(undefined);

export function DemoOrganizationProvider({ children }: { children: React.ReactNode }) {
  const demoContext = useDemoContext();
  
  const organizationContextValue = {
    organization: demoContext.organization,
    isLoading: false,
    error: null,
    isUserInOrganization: true,
    userRole: demoContext.userRole,
    orgSlug: demoContext.organization.slug,
    hasOrganization: true,
    hasMembership: true,
    allUserMemberships: [
      {
        organization_id: demoContext.organization.id,
        role: demoContext.userRole,
        organization: demoContext.organization
      }
    ],
    hasAdminAccess: false,
    canSwitchOrganizations: false
  };

  return (
    <OrganizationContext.Provider value={organizationContextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Export the hook that matches the real useOrganization hook
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}