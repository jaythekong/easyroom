import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Globe, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Palette,
  Users,
  Building2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PlatformSettings {
  general: {
    platformName: string;
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    requireEmailVerification: boolean;
  };
  features: {
    organizationCreation: boolean;
    publicBookings: boolean;
    telegramIntegration: boolean;
    analyticsTracking: boolean;
  };
  limits: {
    maxOrganizations: number;
    maxUsersPerOrg: number;
    maxRoomsPerOrg: number;
    sessionTimeout: number;
  };
  notifications: {
    systemAlerts: boolean;
    maintenanceNotices: boolean;
    securityAlerts: boolean;
    emailDigests: boolean;
  };
}

export default function SuperAdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>({
    general: {
      platformName: "Room Booking Platform",
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
    },
    features: {
      organizationCreation: true,
      publicBookings: false,
      telegramIntegration: true,
      analyticsTracking: true,
    },
    limits: {
      maxOrganizations: 1000,
      maxUsersPerOrg: 500,
      maxRoomsPerOrg: 100,
      sessionTimeout: 24,
    },
    notifications: {
      systemAlerts: true,
      maintenanceNotices: true,
      securityAlerts: true,
      emailDigests: false,
    },
  });

  const handleSave = () => {
    toast({
      title: "Settings Updated",
      description: "Platform settings have been saved successfully.",
    });
  };

  const updateSetting = (section: keyof PlatformSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Settings</h1>
          <p className="text-muted-foreground">Configure platform-wide settings and policies</p>
        </div>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.general.platformName}
                onChange={(e) => updateSetting('general', 'platformName', e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Temporarily disable platform access</p>
              </div>
              <Switch
                checked={settings.general.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('general', 'maintenanceMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow New Registrations</Label>
                <p className="text-sm text-muted-foreground">Enable new user sign-ups</p>
              </div>
              <Switch
                checked={settings.general.allowNewRegistrations}
                onCheckedChange={(checked) => updateSetting('general', 'allowNewRegistrations', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">Force email verification for new users</p>
              </div>
              <Switch
                checked={settings.general.requireEmailVerification}
                onCheckedChange={(checked) => updateSetting('general', 'requireEmailVerification', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Feature Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Organization Creation</Label>
                <p className="text-sm text-muted-foreground">Allow users to create new organizations</p>
              </div>
              <Switch
                checked={settings.features.organizationCreation}
                onCheckedChange={(checked) => updateSetting('features', 'organizationCreation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Public Bookings</Label>
                <p className="text-sm text-muted-foreground">Enable bookings without authentication</p>
              </div>
              <Switch
                checked={settings.features.publicBookings}
                onCheckedChange={(checked) => updateSetting('features', 'publicBookings', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Telegram Integration</Label>
                <p className="text-sm text-muted-foreground">Enable Telegram notifications</p>
              </div>
              <Switch
                checked={settings.features.telegramIntegration}
                onCheckedChange={(checked) => updateSetting('features', 'telegramIntegration', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">Collect usage analytics</p>
              </div>
              <Switch
                checked={settings.features.analyticsTracking}
                onCheckedChange={(checked) => updateSetting('features', 'analyticsTracking', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Platform Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxOrgs">Maximum Organizations</Label>
              <Input
                id="maxOrgs"
                type="number"
                value={settings.limits.maxOrganizations}
                onChange={(e) => updateSetting('limits', 'maxOrganizations', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="maxUsers">Maximum Users per Organization</Label>
              <Input
                id="maxUsers"
                type="number"
                value={settings.limits.maxUsersPerOrg}
                onChange={(e) => updateSetting('limits', 'maxUsersPerOrg', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="maxRooms">Maximum Rooms per Organization</Label>
              <Input
                id="maxRooms"
                type="number"
                value={settings.limits.maxRoomsPerOrg}
                onChange={(e) => updateSetting('limits', 'maxRoomsPerOrg', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.limits.sessionTimeout}
                onChange={(e) => updateSetting('limits', 'sessionTimeout', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>System Alerts</Label>
                <p className="text-sm text-muted-foreground">Critical system notifications</p>
              </div>
              <Switch
                checked={settings.notifications.systemAlerts}
                onCheckedChange={(checked) => updateSetting('notifications', 'systemAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Notices</Label>
                <p className="text-sm text-muted-foreground">Planned maintenance notifications</p>
              </div>
              <Switch
                checked={settings.notifications.maintenanceNotices}
                onCheckedChange={(checked) => updateSetting('notifications', 'maintenanceNotices', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Security Alerts</Label>
                <p className="text-sm text-muted-foreground">Security-related notifications</p>
              </div>
              <Switch
                checked={settings.notifications.securityAlerts}
                onCheckedChange={(checked) => updateSetting('notifications', 'securityAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Digests</Label>
                <p className="text-sm text-muted-foreground">Weekly platform summary emails</p>
              </div>
              <Switch
                checked={settings.notifications.emailDigests}
                onCheckedChange={(checked) => updateSetting('notifications', 'emailDigests', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">156</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">23</div>
              <div className="text-sm text-muted-foreground">Total Rooms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-sm text-muted-foreground">Total Bookings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}