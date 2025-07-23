import { Link, useSearchParams } from "react-router-dom";
import { Building, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface AccessDeniedProps {
  orgSlug: string;
  orgName?: string;
}

export function AccessDenied({ orgSlug, orgName }: AccessDeniedProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Log unauthorized access attempt for audit trail
  useEffect(() => {
    const logUnauthorizedAccess = async () => {
      try {
        await supabase.from('unauthorized_access_attempts').insert({
          user_id: user?.id || null,
          attempted_slug: orgSlug,
          user_email: user?.email || null,
          ip_address: null, // Could be populated from headers in edge function
          user_agent: navigator.userAgent
        });
      } catch (error) {
        console.error('Failed to log unauthorized access attempt:', error);
      }
    };

    logUnauthorizedAccess();
  }, [orgSlug, user?.id, user?.email]);

  const redirectTo = searchParams.get('redirectTo');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <Building className="h-12 w-12 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You don't have permission to view{" "}
              <span className="font-semibold">
                {orgName || orgSlug}
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact an admin to get invited to this organization.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full">
            <Button asChild variant="outline">
              <Link to="/select-org">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to My Organizations
              </Link>
            </Button>
            
            {redirectTo && (
              <Button asChild variant="ghost" size="sm">
                <Link to={redirectTo}>
                  Back to where you came from
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}