import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function InviteRedirect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('[InviteRedirect] Handling redirect for token:', token);
      
      if (!token) {
        console.log('[InviteRedirect] No token provided, navigating to home');
        navigate("/");
        return;
      }

      try {
        // Only handle UUID tokens now
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
        
        if (!isUUID) {
          console.log('[InviteRedirect] Invalid token format, navigating to home');
          navigate("/");
          return;
        }

        console.log('[InviteRedirect] Valid UUID token, tracking open and redirecting');
        
        // Track the open
        try {
          await supabase.rpc('track_invitation_open', {
            invitation_token: token
          });
        } catch (trackError) {
          console.warn('[InviteRedirect] Failed to track token open:', trackError);
        }
        
        // Direct token access
        navigate(`/invite?token=${token}`);
      } catch (error) {
        console.error('[InviteRedirect] Error handling invite redirect:', error);
        navigate("/");
      }
    };

    handleRedirect();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Redirecting to invitation...</p>
      </div>
    </div>
  );
}