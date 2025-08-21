import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Square, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
}

interface DemoConfig {
  id: string;
  demo_organization_id: string;
  demo_user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organizations?: Organization;
}

export function DemoConfiguration() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch current demo configuration
  const { data: demoConfig, isLoading: configLoading } = useQuery({
    queryKey: ['demo-configuration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_configuration')
        .select(`
          *,
          organizations (
            id,
            name,
            slug,
            status
          )
        `)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as DemoConfig | null;
    },
  });

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations-for-demo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data as Organization[];
    },
  });

  // Fetch admin users for selected organization
  const { data: adminUsers = [] } = useQuery({
    queryKey: ['admin-users', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name')
        .eq('organization_id', selectedOrgId)
        .eq('role', 'admin');

      if (error) throw error;
      return data.map(user => ({
        id: user.user_id,
        email: user.email,
        display_name: user.display_name
      })) as AdminUser[];
    },
    enabled: !!selectedOrgId,
  });

  // Create/update demo configuration
  const createDemoConfig = useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      // First deactivate any existing config
      if (demoConfig) {
        await supabase
          .from('demo_configuration')
          .update({ is_active: false })
          .eq('id', demoConfig.id);
      }

      // Create new config
      const { data, error } = await supabase
        .from('demo_configuration')
        .insert({
          demo_organization_id: orgId,
          demo_user_id: userId,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-configuration'] });
      toast.success("Demo configuration updated successfully");
      setSelectedOrgId("");
      setSelectedUserId("");
    },
    onError: (error) => {
      toast.error("Failed to update demo configuration: " + error.message);
    },
  });

  // Deactivate demo configuration
  const deactivateDemoConfig = useMutation({
    mutationFn: async () => {
      if (!demoConfig) throw new Error("No active demo configuration");

      const { error } = await supabase
        .from('demo_configuration')
        .update({ is_active: false })
        .eq('id', demoConfig.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-configuration'] });
      toast.success("Demo configuration deactivated");
    },
    onError: (error) => {
      toast.error("Failed to deactivate demo configuration: " + error.message);
    },
  });

  const handleSave = () => {
    if (!selectedOrgId || !selectedUserId) {
      toast.error("Please select both organization and admin user");
      return;
    }

    createDemoConfig.mutate({ orgId: selectedOrgId, userId: selectedUserId });
  };

  if (configLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Demo Configuration
        </CardTitle>
        <CardDescription>
          Configure which organization and admin user will be used for the demo experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Configuration */}
        {demoConfig && (
          <Alert>
            <Play className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Current Demo Configuration:</div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Organization:</Badge>
                  <span>{demoConfig.organizations?.name} ({demoConfig.organizations?.slug})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">User ID:</Badge>
                  <span className="font-mono text-sm">{demoConfig.demo_user_id}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deactivateDemoConfig.mutate()}
                    disabled={deactivateDemoConfig.isPending}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Deactivate Demo
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Demo Organization</label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization for demo" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrgId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Demo Admin User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select admin user for demo" />
                </SelectTrigger>
                <SelectContent>
                  {adminUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!selectedOrgId || !selectedUserId || createDemoConfig.isPending}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {demoConfig ? 'Update Demo Configuration' : 'Set Demo Configuration'}
          </Button>
        </div>

        {/* Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> The demo will use the selected admin user's credentials.
            Make sure this user has appropriate permissions and sample data in their organization.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}