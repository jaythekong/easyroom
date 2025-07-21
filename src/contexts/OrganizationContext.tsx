import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
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
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserInOrganization, setIsUserInOrganization] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (orgSlug) {
      fetchOrganization();
    }
  }, [orgSlug, user]);

  const fetchOrganization = async () => {
    if (!orgSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (orgError) {
        if (orgError.code === 'PGRST116') {
          setError('Organization not found');
        } else {
          throw orgError;
        }
        return;
      }

      setOrganization(org);

      // Check if user belongs to this organization
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', org.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileError);
        }

        if (profile) {
          setIsUserInOrganization(true);
          setUserRole(profile.role);
        } else {
          setIsUserInOrganization(false);
          setUserRole(null);
        }
      }
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      setError('Failed to load organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        error,
        isUserInOrganization,
        userRole,
      }}
    >
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