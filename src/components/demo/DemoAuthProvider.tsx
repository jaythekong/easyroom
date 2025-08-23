import React, { createContext, useContext } from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

// Create a mock auth context for demo mode
const DemoAuthContext = createContext<any>(null);

export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const demoContext = useDemoContext();
  
  const authContextValue = {
    user: demoContext.user,
    session: { user: demoContext.user },
    loading: false,
    signOut: async () => {
      console.log('Demo mode - sign out clicked');
    }
  };

  return (
    <DemoAuthContext.Provider value={authContextValue}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth() {
  const context = useContext(DemoAuthContext);
  if (!context) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  return context;
}