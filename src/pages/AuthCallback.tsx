import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        logger.debug('Processing auth callback...');
        
        // Get the session after callback
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Auth callback error:', error);
          navigate('/auth?error=callback_failed');
          return;
        }

        if (session && session.user) {
          logger.debug('Auth callback successful, user confirmed:', session.user.email);
          
          // Check for pending organization redirect
          const pendingOrgSlug = localStorage.getItem('pendingOrgSlug');
          const redirectTo = searchParams.get('redirect_to');
          
          if (pendingOrgSlug) {
            logger.debug('Redirecting to pending organization:', pendingOrgSlug);
            localStorage.removeItem('pendingOrgSlug');
            navigate(`/${pendingOrgSlug}/onboarding`);
          } else if (redirectTo) {
            logger.debug('Redirecting to specified path:', redirectTo);
            navigate(redirectTo);
          } else {
            // Default redirect to dashboard or select org
            navigate('/select-org');
          }
        } else {
          logger.debug('No session found after callback, redirecting to auth');
          navigate('/auth');
        }
      } catch (error) {
        logger.error('Unexpected error in auth callback:', error);
        navigate('/auth?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <h2 className="text-lg font-semibold">Confirming your email...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;