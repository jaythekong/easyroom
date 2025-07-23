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
  user_count?: number;
  room_count?: number;
  booking_count?: number;
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
    refetchInterval: 60000, // Refresh every minute
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