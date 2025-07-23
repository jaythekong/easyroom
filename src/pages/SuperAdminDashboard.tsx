import { useAuth } from "@/hooks/useAuth";

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

  // Check super admin status
  const isSuperAdmin = session?.access_token ? 
    (() => {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        console.log('JWT payload super_admin:', payload.super_admin);
        return payload.super_admin === true;
      } catch (error) {
        console.error('Error parsing JWT:', error);
        return false;
      }
    })() : false;

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Platform Operations Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, Super Admin! ({user.email})
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary/10 p-6 rounded-lg">
            <h3 className="font-semibold">Organizations</h3>
            <p className="text-2xl font-bold mt-2">Loading...</p>
          </div>
          <div className="bg-blue-500/10 p-6 rounded-lg">
            <h3 className="font-semibold">Users</h3>
            <p className="text-2xl font-bold mt-2">Loading...</p>
          </div>
          <div className="bg-green-500/10 p-6 rounded-lg">
            <h3 className="font-semibold">Bookings</h3>
            <p className="text-2xl font-bold mt-2">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}