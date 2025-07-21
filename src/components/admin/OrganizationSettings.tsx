import { useState, useEffect } from "react";
import { Settings, Globe, Check, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export function OrganizationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  const fetchOrganization = async () => {
    if (!user) return;

    try {
      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      setOrganization(org);
      setOrgName(org.name);
      setSubdomain(org.slug);
      setOriginalSubdomain(org.slug);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
        variant: "destructive",
      });
    }
  };

  const checkSubdomainAvailability = async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck === originalSubdomain) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slugToCheck)
        .neq('id', organization?.id || '');

      if (error) throw error;

      setIsAvailable(data.length === 0);
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    setSubdomain(cleanSlug);
    
    // Debounce the availability check
    setTimeout(() => {
      checkSubdomainAvailability(cleanSlug);
    }, 500);
  };

  const saveSettings = async () => {
    if (!organization || !orgName.trim() || !subdomain.trim()) return;

    if (isAvailable === false) {
      toast({
        title: "Subdomain unavailable",
        description: "Please choose a different subdomain",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName.trim(),
          slug: subdomain.trim(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOriginalSubdomain(subdomain);
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully",
      });

      // Refresh data
      fetchOrganization();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySubdomainUrl = async () => {
    const subdomainUrl = `https://${subdomain}.yourapp.com`;
    await navigator.clipboard.writeText(subdomainUrl);
    toast({
      title: "Copied!",
      description: "Subdomain URL copied to clipboard",
    });
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  const hasChanges = orgName !== organization.name || subdomain !== originalSubdomain;
  const canSave = hasChanges && orgName.trim() && subdomain.trim() && isAvailable !== false;

  return (
    <div className="space-y-6">
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Settings
          </CardTitle>
          <CardDescription>
            Manage your organization's basic information and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>

          <div>
            <Label htmlFor="orgId">Organization ID</Label>
            <Input
              id="orgId"
              value={organization.id}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This is your unique organization identifier (read-only)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subdomain Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Subdomain Setup
          </CardTitle>
          <CardDescription>
            Configure your organization's custom subdomain for branded access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="your-company"
                  className="pr-12"
                />
                {isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!isChecking && isAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              <span className="text-muted-foreground">.yourapp.com</span>
            </div>
            
            {isAvailable === true && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Subdomain is available
              </p>
            )}
            {isAvailable === false && (
              <p className="text-sm text-destructive mt-1">
                ✗ Subdomain is already taken
              </p>
            )}
            
            <p className="text-sm text-muted-foreground mt-1">
              Your organization will be accessible at: <code className="bg-muted px-1 rounded">https://{subdomain}.yourapp.com</code>
            </p>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Current Subdomain</p>
              <p className="text-sm text-muted-foreground">
                https://{originalSubdomain}.yourapp.com
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySubdomainUrl}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={fetchOrganization}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!canSave || isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Subdomain Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Subdomains must be 3-63 characters long and contain only letters, numbers, and hyphens</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Changes may take a few minutes to propagate across the internet</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>Your old subdomain will redirect to the new one automatically</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}