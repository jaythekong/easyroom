import { useState } from "react";
import { usePlatformOrganizations, useUpdateOrganizationStatus } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Eye, Pause, Play, Building2 } from "lucide-react";
import { format } from "date-fns";
import { OrganizationDetailDrawer } from "./OrganizationDetailDrawer";
import type { PlatformOrganization } from "@/hooks/useSuperAdmin";

export function OrganizationManagement() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrg, setSelectedOrg] = useState<PlatformOrganization | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState<'suspend' | 'reactivate' | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = usePlatformOrganizations(search, currentPage, 10);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrganizationStatus();

  const handleStatusChange = (org: PlatformOrganization, action: 'suspend' | 'reactivate') => {
    setSelectedOrg(org);
    setStatusAction(action);
    setShowStatusModal(true);
    setReason("");
  };

  const confirmStatusChange = () => {
    if (!selectedOrg || !statusAction) return;

    const newStatus = statusAction === 'suspend' ? 'suspended' : 'active';
    updateStatus({
      organizationId: selectedOrg.id,
      status: newStatus,
      reason: reason.trim() || undefined
    });

    setShowStatusModal(false);
    setStatusAction(null);
    setReason("");
  };

  return (
    <>
      <Card className="glass-card border-0 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
              <Building2 className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">Organizations</CardTitle>
              <p className="text-xs text-muted-foreground">Manage platform organizations</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading organizations...</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                      <TableCell>
                        <Badge variant={org.status === 'active' ? 'default' : 'destructive'}>
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(org.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{org.user_count}</TableCell>
                      <TableCell>{org.room_count}</TableCell>
                      <TableCell>{org.booking_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrg(org)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {org.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(org, 'suspend')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(org, 'reactivate')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, data.total)} of {data.total}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={currentPage === data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Organization Detail Drawer */}
      <OrganizationDetailDrawer
        organization={selectedOrg}
        open={!!selectedOrg && !showStatusModal}
        onClose={() => setSelectedOrg(null)}
        onStatusChange={handleStatusChange}
      />

      {/* Status Change Confirmation Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'suspend' ? 'Suspend' : 'Reactivate'} Organization
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to {statusAction} <strong>{selectedOrg?.name}</strong>?
            </p>
            <div>
              <Label htmlFor="reason">Reason {statusAction === 'suspend' ? '(required)' : '(optional)'}</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Enter reason for ${statusAction}...`}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button
              variant={statusAction === 'suspend' ? 'destructive' : 'default'}
              onClick={confirmStatusChange}
              disabled={isUpdating || (statusAction === 'suspend' && !reason.trim())}
            >
              {isUpdating ? 'Processing...' : `${statusAction === 'suspend' ? 'Suspend' : 'Reactivate'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}