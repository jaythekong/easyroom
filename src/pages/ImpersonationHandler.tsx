import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useToast } from '@/hooks/use-toast';

export default function ImpersonationHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const handleImpersonation = async () => {
      const targetUserId = searchParams.get('target_user_id');
      const orgSlug = searchParams.get('org_slug');
      const mode = searchParams.get('mode');
      
      if (!targetUserId || !orgSlug) {
        toast({
          title: "Impersonation Failed",
          description: "Invalid impersonation parameters.",
          variant: "destructive",
        });
        navigate('/super-admin');
        return;
      }
      
      try {
        // Store the current super admin session for restoration
        const currentSession = await supabase.auth.getSession();
        if (currentSession.data.session) {
          sessionStorage.setItem('original_super_admin_session', JSON.stringify({
            access_token: currentSession.data.session.access_token,
            refresh_token: currentSession.data.session.refresh_token
          }));
        }
        
        // Call the edge function to get impersonation tokens
        const { data, error } = await supabase.functions.invoke('handle-impersonation', {
          body: {
            targetUserId,
            orgSlug
          }
        });
        
        if (error || !data.success) {
          throw new Error(data?.error || 'Failed to get impersonation tokens');
        }
        
        // Switch to the target user's session
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        // Wait a moment for the session to be established then redirect
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 1000);
        
      } catch (error) {
        console.error('Error during impersonation:', error);
        toast({
          title: "Impersonation Failed",
          description: error instanceof Error ? error.message : "Failed to switch to target user session.",
          variant: "destructive",
        });
        navigate('/super-admin');
      }
    };
    
    handleImpersonation();
  }, [searchParams, navigate, toast]);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Setting up impersonation...</h1>
        <p className="text-muted-foreground">Please wait while we switch to the target user session.</p>
        <LoadingSkeleton type="stats" />
      </div>
    </div>
  );
}