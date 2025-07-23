import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganizationAuditLog, useImpersonateAdmin } from "@/hooks/useSuperAdmin";
import { formatDistance } from "date-fns";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Building2, Users, MapPin, Calendar, Clock, User, UserCheck, Eye, Settings, Pause, Play } from "lucide-react";
import type { PlatformOrganization } from "@/hooks/useSuperAdmin";

interface OrganizationDetailDrawerProps {
  organization: PlatformOrganization | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (org: PlatformOrganization, action: 'suspend' | 'reactivate') => void;
}

export function OrganizationDetailDrawer({ 
  organization, 
  open, 
  onClose,
  onStatusChange
}: OrganizationDetailDrawerProps) {
  const { data: auditLog, isLoading: auditLoading } = useOrganizationAuditLog(
    organization?.id || ""
  );
  const impersonateAdmin = useImpersonateAdmin();

  if (!organization) return null;

  const handleImpersonate = (mode: 'view_only' | 'full') => {
    impersonateAdmin.mutate({
      organizationId: organization.id,
      mode
    });
  };

  const handleStatusAction = (action: 'suspend' | 'reactivate') => {
    if (onStatusChange) {
      onStatusChange(organization, action);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            {organization.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="mt-1">{organization.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Slug</div>
                  <div className="mt-1 font-mono text-sm">{organization.slug}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge variant={organization.status === 'active' ? 'default' : 'destructive'}>
                      {organization.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Created</div>
                  <div className="mt-1">
                    {formatDistance(new Date(organization.created_at), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impersonate Admin */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Impersonate Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Switch to this organization's admin view for support purposes. All actions are logged.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImpersonate('view_only')}
                    disabled={impersonateAdmin.isPending || organization.status === 'suspended'}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Only
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleImpersonate('full')}
                    disabled={impersonateAdmin.isPending || organization.status === 'suspended'}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Full Access
                  </Button>
                </div>
                {organization.status === 'suspended' && (
                  <p className="text-xs text-yellow-600">
                    ⚠️ Impersonation disabled for suspended organizations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold">{organization.user_count}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </div>
                <div className="text-center">
                  <MapPin className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold">{organization.room_count}</div>
                  <div className="text-sm text-muted-foreground">Rooms</div>
                </div>
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold">{organization.booking_count}</div>
                  <div className="text-sm text-muted-foreground">Bookings (30d)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <LoadingSkeleton type="stats" />
              ) : auditLog && auditLog.length > 0 ? (
                <div className="space-y-3">
                  {auditLog.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.action}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistance(new Date(entry.created_at), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                        {entry.reason && (
                          <div className="text-sm text-muted-foreground">
                            Reason: {entry.reason}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          User ID: {entry.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No audit log entries found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Actions */}
          {onStatusChange && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {organization.status === 'active' ? (
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusAction('suspend')}
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Suspend Organization
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => handleStatusAction('reactivate')}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Reactivate Organization
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}