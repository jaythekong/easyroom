import { useState } from "react";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { OrganizationList } from "@/components/admin/OrganizationList";
import { OrganizationDetailDrawer } from "@/components/admin/OrganizationDetailDrawer";
import { StatusUpdateModal } from "@/components/admin/StatusUpdateModal";
import { useUpdateOrganizationStatus } from "@/hooks/useSuperAdmin";
import type { PlatformOrganization } from "@/hooks/useSuperAdmin";

export default function SuperAdminDashboard() {
  console.log('SuperAdminDashboard component rendering...');
  
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-black">Super Admin Dashboard Test</h1>
        <p className="text-black mt-4">If you see this, the route is working!</p>
      </div>
    </div>
  );
}