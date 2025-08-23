import React, { createContext, useContext } from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

// Create a mock organization context for demo mode
const DemoOrganizationContext = createContext<any>(null);

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
    <DemoOrganizationContext.Provider value={organizationContextValue}>
      {children}
    </DemoOrganizationContext.Provider>
  );
}

export function useDemoOrganization() {
  const context = useContext(DemoOrganizationContext);
  if (!context) {
    throw new Error('useDemoOrganization must be used within a DemoOrganizationProvider');
  }
  return context;
}