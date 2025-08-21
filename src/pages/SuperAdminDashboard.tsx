import { useAuth } from "@/hooks/useAuth";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { OrganizationManagement } from "@/components/admin/OrganizationManagement";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { Crown, Shield, LogOut, Menu } from "lucide-react";

export default function SuperAdminDashboard() {
  console.log('SuperAdminDashboard component rendering...');
  
  // Simple auth check first
  const { user, session } = useAuth();
  console.log('Auth state:', { user: !!user, session: !!session });
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Please log in to continue</p>
          <a href="/super-admin/auth?redirectTo=/super-admin" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded">
            Log In
          </a>
        </div>
      </div>
    );
  }

  // Check super admin status using app_metadata
  const isSuperAdmin = session?.user?.app_metadata?.super_admin === true;
  
  console.log('session.user.app_metadata:', session?.user?.app_metadata);
  console.log('isSuperAdmin:', isSuperAdmin);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have super admin privileges</p>
          <p className="text-sm text-muted-foreground">Logged in as: {user.email}</p>
        </div>
      </div>
    );
  }

  return <SuperAdminDashboardContent user={user} />;
}

function SuperAdminDashboardContent({ user }: { user: any }) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/super-admin/auth';
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <SuperAdminSidebar />
        
        <SidebarInset className="flex-1">
          {/* Compact Header */}
          <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-xl font-bold">Dashboard</h1>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="container mx-auto py-6 px-4 space-y-6">
              {/* Compact Platform Analytics */}
              <PlatformAnalytics />

              {/* Organization Management Section */}
              <div className="animate-fade-in">
                <OrganizationManagement />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}