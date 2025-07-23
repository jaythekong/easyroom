import { useAuth } from "@/hooks/useAuth";
import { usePlatformStats } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import { OrganizationManagement } from "@/components/admin/OrganizationManagement";

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
  const { data: platformStats, isLoading } = usePlatformStats();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Platform Operations Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, Super Admin! ({user.email})
          </p>
        </div>
        
        {/* Platform Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : platformStats?.total_organizations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${platformStats?.active_organizations || 0} active, ${platformStats?.suspended_organizations || 0} suspended`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : platformStats?.total_users || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : platformStats?.total_rooms || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Meeting spaces available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : platformStats?.total_bookings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                All-time bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organization Management Section */}
        <OrganizationManagement />
      </div>
    </div>
  );
}