import React from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

// Re-export the real OrganizationContext but with demo data
import { OrganizationProvider as RealOrganizationProvider } from '@/contexts/OrganizationContext';

export function DemoOrganizationWrapper({ children }: { children: React.ReactNode }) {
  const demoContext = useDemoContext();
  
  // Create a mock provider that provides the organization context with demo data
  return (
    <div data-demo-org-context="true">
      {children}
    </div>
  );
}