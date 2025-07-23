import { useSuperAdminCheck } from "@/hooks/useSuperAdmin";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogIn } from "lucide-react";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  console.log('SuperAdminGuard rendering...');
  const { isSuperAdmin, user, loading } = useSuperAdminCheck();
  console.log('SuperAdminGuard state:', { isSuperAdmin, user: !!user, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSkeleton type="stats" />
      </div>
    );
  }

  // If no user, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Super Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You need to be logged in to access the Super Admin dashboard.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth?redirectTo=/super-admin">
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user but no super admin access, show access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have super admin privileges to access this dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact a platform administrator to request access.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                Go to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}