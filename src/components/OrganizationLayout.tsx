
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Building, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/hooks/useAuth";

interface OrganizationLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function OrganizationLayout({ 
  children, 
  requireAuth = false, 
  requireAdmin = false 
}: OrganizationLayoutProps) {
  const { organization, isLoading: orgLoading, error, isUserInOrganization, userRole } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  console.log('OrganizationLayout state:', {
    orgLoading,
    authLoading,
    organization: organization?.name,
    user: user?.email,
    requireAuth,
    isUserInOrganization,
    userRole,
    pathname: location.pathname
  });

  // Show loading only for initial loads, not quick navigation transitions
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orgLoading && !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if organization not found
  if (error || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Organization Not Found</h2>
              <p className="text-muted-foreground mt-2">
                {error || "The organization you're looking for doesn't exist."}
              </p>
            </div>
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only check auth if explicitly required
  if (requireAuth) {
    // If no user, redirect to org auth
    if (!user) {
      const redirectPath = `/${organization.slug}${location.pathname.replace(/^\/[^\/]+/, '')}`;
      console.log('OrganizationLayout: No user, redirecting to org auth with redirectTo:', redirectPath);
      return <Navigate to={`/${organization.slug}/auth?redirectTo=${encodeURIComponent(redirectPath)}`} replace />;
    }

    // If user exists but not in organization, show access denied (only if not loading)
    if (!isUserInOrganization && !orgLoading) {
      console.log('OrganizationLayout: User not in organization, showing access denied');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <Building className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Access Denied</h2>
                <p className="text-muted-foreground mt-2">
                  You don't have access to <span className="font-medium">{organization.name}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  User: {user.email}
                </p>
              </div>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Check admin requirements
    if (requireAdmin && userRole !== 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold">Admin Access Required</h2>
                <p className="text-muted-foreground mt-2">
                  You need admin privileges to access this section of <span className="font-medium">{organization.name}</span>
                </p>
              </div>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  console.log('OrganizationLayout: All checks passed, rendering children');
  // Render children with organization context
  return <>{children}</>;
}
