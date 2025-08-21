import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function InviteRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('[InviteRedirect] Handling redirect for shortCode:', shortCode);
      
      if (!shortCode) {
        console.log('[InviteRedirect] No shortCode provided, navigating to home');
        navigate("/");
        return;
      }

      try {
        console.log('[InviteRedirect] Processing shortCode:', shortCode);
        
        // Check if it's a short code or UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortCode);
        
        if (isUUID) {
          console.log('[InviteRedirect] Detected UUID, tracking open and redirecting directly');
          // Track the open for UUID tokens too
          try {
            await supabase.rpc('track_invitation_open', {
              invitation_token: shortCode
            });
          } catch (trackError) {
            console.warn('[InviteRedirect] Failed to track UUID token open:', trackError);
          }
          // Direct token access
          navigate(`/invite?token=${shortCode}`);
          return;
        }

        // Short code lookup with tracking
        console.log('[InviteRedirect] Looking up short code and tracking open:', shortCode.toUpperCase());
        
        const { data, error } = await supabase.rpc('track_invitation_open', {
          invitation_short_code: shortCode.toUpperCase()
        });

        if (error || !data) {
          console.error('[InviteRedirect] Invalid short code or error:', error, 'data:', data);
          navigate("/");
          return;
        }

        // The tracking response should contain the invitation details
        const inviteData = data as any;
        
        // First try to get invite_token directly from tracking response
        let inviteToken = inviteData.invite_token;
        
        // If not available, get it from the database using the invitation ID
        if (!inviteToken && inviteData.id) {
          const { data: tokenData } = await supabase
            .from('invitations')
            .select('invite_token')
            .eq('id', inviteData.id)
            .single();
          inviteToken = tokenData?.invite_token;
        }

        if (!inviteToken) {
          console.error('[InviteRedirect] Could not get invite token');
          navigate("/");
          return;
        }

        // Redirect to full invite URL
        console.log('[InviteRedirect] Found invite token, redirecting to:', `/invite?token=${inviteToken}`);
        navigate(`/invite?token=${inviteToken}`);
      } catch (error) {
        console.error('[InviteRedirect] Error handling invite redirect:', error);
        navigate("/");
      }
    };

    handleRedirect();
  }, [shortCode, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Redirecting to invitation...</p>
      </div>
    </div>
  );
}