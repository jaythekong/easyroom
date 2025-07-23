import { useState } from "react";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { OrganizationList } from "@/components/admin/OrganizationList";
import { OrganizationDetailDrawer } from "@/components/admin/OrganizationDetailDrawer";
import { StatusUpdateModal } from "@/components/admin/StatusUpdateModal";
import { useUpdateOrganizationStatus } from "@/hooks/useSuperAdmin";
import type { PlatformOrganization } from "@/hooks/useSuperAdmin";

export default function SuperAdminDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<PlatformOrganization | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    organization: PlatformOrganization;
    newStatus: 'active' | 'suspended';
  } | null>(null);

  const updateStatusMutation = useUpdateOrganizationStatus();

  const handleViewDetails = (organization: PlatformOrganization) => {
    setSelectedOrg(organization);
    setDetailsOpen(true);
  };

  const handleUpdateStatus = (organization: PlatformOrganization, newStatus: 'active' | 'suspended') => {
    setPendingStatusUpdate({ organization, newStatus });
    setStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = (reason?: string) => {
    if (!pendingStatusUpdate) return;

    updateStatusMutation.mutate({
      organizationId: pendingStatusUpdate.organization.id,
      status: pendingStatusUpdate.newStatus,
      reason
    }, {
      onSuccess: () => {
        setStatusModalOpen(false);
        setPendingStatusUpdate(null);
      }
    });
  };

  const handleCloseStatusModal = () => {
    setStatusModalOpen(false);
    setPendingStatusUpdate(null);
  };

  return (
    <SuperAdminGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Platform Operations Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage all organizations and monitor platform health
            </p>
          </div>

          <PlatformAnalytics />
          
          <OrganizationList 
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
          />

          <OrganizationDetailDrawer
            organization={selectedOrg}
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
          />

          <StatusUpdateModal
            organization={pendingStatusUpdate?.organization || null}
            newStatus={pendingStatusUpdate?.newStatus || null}
            open={statusModalOpen}
            onClose={handleCloseStatusModal}
            onConfirm={handleConfirmStatusUpdate}
            isLoading={updateStatusMutation.isPending}
          />
        </div>
      </div>
    </SuperAdminGuard>
  );
}