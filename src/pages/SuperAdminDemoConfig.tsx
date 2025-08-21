import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import { DemoConfiguration } from "@/components/admin/DemoConfiguration";

export default function SuperAdminDemoConfig() {
  return (
    <SuperAdminGuard>
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Demo Configuration</h1>
            <p className="text-muted-foreground">
              Configure which organization and admin account will be used for the platform demo
            </p>
          </div>
          
          <DemoConfiguration />
        </div>
      </div>
    </SuperAdminGuard>
  );
}