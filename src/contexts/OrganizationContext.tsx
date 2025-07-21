
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserInOrganization, setIsUserInOrganization] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (orgSlug) {
      console.log('OrganizationProvider: Starting fetch for orgSlug:', orgSlug);
      fetchOrganization();
    } else {
      console.log('OrganizationProvider: No orgSlug provided');
      setIsLoading(false);
    }
  }, [orgSlug]);

  // Separate effect for user membership check that depends on both org and user
  useEffect(() => {
    if (organization && !authLoading) {
      console.log('OrganizationProvider: Checking user membership for org:', organization.name, 'user:', user?.email);
      checkUserMembership();
    }
  }, [organization, user, authLoading]);

  const fetchOrganization = async () => {
    if (!orgSlug) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log('OrganizationProvider: Fetching organization with slug:', orgSlug);

      // Fetch organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (orgError) {
        console.error('OrganizationProvider: Error fetching organization:', orgError);
        if (orgError.code === 'PGRST116') {
          setError('Organization not found');
        } else {
          setError('Failed to load organization');
        }
        return;
      }

      console.log('OrganizationProvider: Successfully fetched organization:', org.name);
      setOrganization(org);
    } catch (error: any) {
      console.error('OrganizationProvider: Unexpected error:', error);
      setError('Failed to load organization');
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserMembership = async () => {
    if (!organization || !user) {
      console.log('OrganizationProvider: Skipping membership check - no org or user');
      setIsUserInOrganization(false);
      setUserRole(null);
      return;
    }

    try {
      console.log('OrganizationProvider: Checking membership for user:', user.email, 'in org:', organization.name);
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (profileError) {
        if (profileError.code !== 'PGRST116') {
          console.error('OrganizationProvider: Error fetching user profile:', profileError);
        } else {
          console.log('OrganizationProvider: User not found in organization');
        }
        setIsUserInOrganization(false);
        setUserRole(null);
        return;
      }

      console.log('OrganizationProvider: User found with role:', profile.role);
      setIsUserInOrganization(true);
      setUserRole(profile.role);
    } catch (error: any) {
      console.error('OrganizationProvider: Error checking membership:', error);
      setIsUserInOrganization(false);
      setUserRole(null);
    }
  };

  const contextValue = {
    organization,
    isLoading: isLoading || authLoading,
    error,
    isUserInOrganization,
    userRole,
  };

  console.log('OrganizationProvider: Context value:', contextValue);

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
