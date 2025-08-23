import React from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

// Create a mock auth provider that provides the auth context with demo data
export function DemoAuthWrapper({ children }: { children: React.ReactNode }) {
  const demoContext = useDemoContext();
  
  return (
    <div data-demo-auth-context="true">
      {children}
    </div>
  );
}