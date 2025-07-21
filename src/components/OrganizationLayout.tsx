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
  const { organization, isLoading, error, isUserInOrganization, userRole } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // Show loading while fetching data
  if (isLoading || authLoading) {
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

  // Check authentication requirements
  if (requireAuth && !user) {
    // Redirect to organization-specific auth page
    const redirectPath = `/${organization.slug}${location.pathname.replace(/^\/[^\/]+/, '')}`;
    console.log('OrganizationLayout: Redirecting to org auth with redirectTo:', redirectPath);
    return <Navigate to={`/${organization.slug}/auth?redirectTo=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // Check organization membership
  if (requireAuth && user && !isUserInOrganization) {
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

  // Render children with organization context
  return <>{children}</>;
}