import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function InviteRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!shortCode) {
        navigate("/");
        return;
      }

      try {
        // Check if it's a short code or UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortCode);
        
        if (isUUID) {
          // Direct token access
          navigate(`/invite?token=${shortCode}`);
          return;
        }

        // Short code lookup
        const { data, error } = await supabase
          .from('invitations')
          .select('invite_token')
          .eq('short_code', shortCode.toUpperCase())
          .single();

        // Update open count when accessed
        if (data?.invite_token) {
          // First get current count, then increment
          const { data: currentData } = await supabase
            .from('invitations')
            .select('open_count')
            .eq('invite_token', data.invite_token)
            .single();
          
          await supabase
            .from('invitations')
            .update({ 
              open_count: (currentData?.open_count || 0) + 1, 
              last_opened_at: new Date().toISOString() 
            })
            .eq('invite_token', data.invite_token);
        }

        if (error || !data) {
          console.error('Invalid short code:', error);
          navigate("/");
          return;
        }

        // Redirect to full invite URL
        navigate(`/invite?token=${data.invite_token}`);
      } catch (error) {
        console.error('Error handling invite redirect:', error);
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