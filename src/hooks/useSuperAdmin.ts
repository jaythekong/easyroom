import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SuperAdminUser {
  id: string;
  email?: string;
  created_at: string;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  user_count: number;
  room_count: number;
  booking_count: number;
  admin_name?: string;
  admin_email?: string;
  admin_id?: string;
  member_count?: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  organization_id: string;
  action: string;
  reason?: string;
  metadata?: any;
  created_at: string;
}

export interface PlatformStats {
  total_organizations: number;
  total_users: number;
  total_rooms: number;
  total_bookings: number;
  active_organizations: number;
  suspended_organizations: number;
}

export function useSuperAdminCheck() {
  const { user, session } = useAuth();
  
  console.log('=== useSuperAdminCheck Debug ===');
  console.log('user exists:', !!user);
  console.log('session exists:', !!session);
  console.log('session.user exists:', !!session?.user);
  console.log('session.user.app_metadata:', session?.user?.app_metadata);
  
  const isSuperAdmin = session?.user?.app_metadata?.super_admin === true;
  console.log('final isSuperAdmin result:', isSuperAdmin);

  return {
    isSuperAdmin,
    user,
    loading: !user && !session
  };
}

export function usePlatformOrganizations(search?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['platform-organizations', search, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('id, name, slug, status, created_at')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Get stats for each organization
      const orgsWithStats = await Promise.all(
        (data || []).map(async (org) => {
          const { data: statsData } = await supabase.rpc('get_organization_stats', { org_id: org.id });
          const stats = statsData as any;
          return {
            ...org,
            user_count: stats?.users || 0,
            room_count: stats?.rooms || 0,
            booking_count: stats?.bookings_30_days || 0,
          };
        })
      );

      return {
        organizations: orgsWithStats,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: true,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats');
      if (error) throw error;
      return data as any as PlatformStats;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

export function useOrganizationAuditLog(organizationId: string) {
  return useQuery({
    queryKey: ['organization-audit-log', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!organizationId,
  });
}

export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      status, 
      reason 
    }: { 
      organizationId: string; 
      status: 'active' | 'suspended'; 
      reason?: string;
    }) => {
      // Update organization status
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ status })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      // Log the action
      const { error: auditError } = await supabase
        .from('platform_audit_log')
        .insert({
          user_id: user!.id,
          organization_id: organizationId,
          action: status === 'active' ? 'reactivate' : 'suspend',
          reason,
          metadata: { previous_status: status === 'active' ? 'suspended' : 'active' }
        });

      if (auditError) throw auditError;

      return { organizationId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-audit-log', data.organizationId] });
      
      toast({
        title: "Status Updated",
        description: `Organization ${data.status === 'active' ? 'reactivated' : 'suspended'} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update organization status.",
        variant: "destructive",
      });
      console.error('Error updating organization status:', error);
    },
  });
}

export function useImpersonateAdmin() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      mode = 'view_only' 
    }: { 
      organizationId: string; 
      mode?: 'view_only' | 'full';
    }) => {
      const { data, error } = await supabase.rpc('impersonate_admin', {
        target_org_id: organizationId,
        impersonation_mode: mode
      });

      if (error) throw error;
      return { ...data as any, organizationId };
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Impersonation Started",
        description: `Now acting as admin for organization. Mode: ${variables.mode}`,
      });
      
      // Get the organization slug and redirect
      try {
        const { data: orgData, error } = await supabase
          .from('organizations')
          .select('slug')
          .eq('id', variables.organizationId)
          .single();
          
        if (orgData && !error) {
          // Force redirect to the organization dashboard
          window.location.href = `/${orgData.slug}`;
        } else {
          console.error('Failed to get organization slug:', error);
          // Fallback: just reload to pick up the new session
          window.location.reload();
        }
      } catch (error) {
        console.error('Error during impersonation redirect:', error);
        window.location.reload();
      }
    },
    onError: (error) => {
      toast({
        title: "Impersonation Failed",
        description: "Failed to start impersonation session.",
        variant: "destructive",
      });
      console.error('Error starting impersonation:', error);
    },
  });
}

export function useEndImpersonation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('end_impersonation');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Restore original session
      const originalSession = sessionStorage.getItem('original_super_admin_session');
      if (originalSession) {
        sessionStorage.removeItem('original_super_admin_session');
      }
      
      toast({
        title: "Impersonation Ended",
        description: "Returned to super admin session.",
      });
      
      // Redirect back to super admin dashboard
      setTimeout(() => {
        window.location.href = '/super-admin';
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to end impersonation session.",
        variant: "destructive",
      });
      console.error('Error ending impersonation:', error);
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      const { data, error } = await supabase.rpc('delete_organization', {
        org_id: organizationId
      });
      if (error) throw error;
      return data as {
        success: boolean;
        organization_name: string;
        organization_slug: string;
        deleted_data_counts: any;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      
      toast({
        title: "Organization Deleted",
        description: `"${data.organization_name}" has been permanently deleted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting organization:', error);
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      newAdminEmail 
    }: { 
      organizationId: string; 
      newAdminEmail: string;
    }) => {
      const { data, error } = await supabase.rpc('transfer_organization_ownership', {
        org_id: organizationId,
        new_admin_email: newAdminEmail
      });
      if (error) throw error;
      return data as {
        success: boolean;
        organization_name: string;
        new_admin_email: string;
        was_existing_member: boolean;
        total_admins: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      
      toast({
        title: "Ownership Transferred",
        description: `Admin access granted to ${data.new_admin_email} for "${data.organization_name}".`,
      });
    },
    onError: (error) => {
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer ownership. Please check the email address and try again.",
        variant: "destructive",
      });
      console.error('Error transferring ownership:', error);
    },
  });
}

// Get organization members
export const useOrganizationMembers = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['organizationMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_organization_memberships!inner(role)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }

      return data;
    },
    enabled: !!organizationId,
  });
};