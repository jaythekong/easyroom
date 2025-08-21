import { useAuth } from "@/hooks/useAuth";
import { useEndImpersonation } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ImpersonationBanner() {
  const { session } = useAuth();
  const endImpersonation = useEndImpersonation();

  // Check if current user is being impersonated
  const isImpersonated = session?.user?.app_metadata?.impersonator_id;
  const impersonationMode = session?.user?.app_metadata?.impersonation_mode;
  
  if (!isImpersonated) return null;

  const handleExitImpersonation = () => {
    endImpersonation.mutate();
  };

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 border-0 rounded-none bg-yellow-500/90 backdrop-blur-sm text-yellow-900 border-b border-yellow-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            🔄 Impersonation Active
          </span>
          <span className="text-sm">
            Acting as organization admin • Mode: {impersonationMode || 'view_only'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExitImpersonation}
          disabled={endImpersonation.isPending}
          className="bg-yellow-600 hover:bg-yellow-700 text-yellow-100 border-yellow-700"
        >
          <LogOut className="h-3 w-3 mr-1" />
          Exit Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
}