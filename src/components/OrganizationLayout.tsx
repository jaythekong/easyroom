
import { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AccessDenied";
import { logger } from "@/lib/logger";

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
  const params = useParams();
  const orgSlug = params.orgSlug || '';

  const handleGoBack = () => {
    window.history.back();
  };

  // Show loading only for initial loads
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
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
                The organization you're looking for doesn't exist.
              </p>
            </div>
            <Button onClick={handleGoBack} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if organization is suspended
  if (organization?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Organization Suspended</h2>
              <p className="text-muted-foreground mt-2">
                <strong>{organization.name}</strong> has been temporarily suspended.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please contact your administrator or platform support for more information.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Go to Home
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
      return <Navigate to={`/${organization.slug}/auth?redirectTo=${encodeURIComponent(redirectPath)}`} replace />;
    }

    // If user exists but not in organization, show access denied
    if (!isUserInOrganization && !orgLoading) {
      logger.security('Access denied - user not in organization', {
        userId: user.id,
        organizationId: organization.id,
        userEmail: user.email
      });
      
      return <AccessDenied orgSlug={orgSlug} orgName={organization?.name} />;
    }

    // Check admin requirements
    if (requireAdmin && userRole !== 'admin') {
      logger.security('Access denied - admin required', {
        userId: user.id,
        organizationId: organization.id,
        requiredRole: 'admin',
        userRole
      });
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold">Admin Access Required</h2>
                <p className="text-muted-foreground mt-2">
                  You need admin privileges to access this section.
                </p>
              </div>
              <Button onClick={handleGoBack} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Render children with organization context
  return <>{children}</>;
}
