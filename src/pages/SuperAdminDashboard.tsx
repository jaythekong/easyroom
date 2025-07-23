import { useAuth } from "@/hooks/useAuth";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { OrganizationManagement } from "@/components/admin/OrganizationManagement";
import { Crown, Shield, Sparkles } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Hero Header */}
        <div className="relative">
          <div className="glass-card p-8 border-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-4xl font-bold gradient-text">Platform Operations</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Welcome back, Super Admin
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Platform Analytics */}
        <PlatformAnalytics />

        {/* Organization Management Section */}
        <div className="animate-fade-in">
          <OrganizationManagement />
        </div>
      </div>
    </div>
  );
}