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
        
        // Check both URL params and hash params for compatibility
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const type = searchParams.get('type') || hashParams.get('type');
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
        const redirectTo = searchParams.get('redirect_to') || hashParams.get('redirect_to');
        
        // Handle error cases from hash
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          logger.error('Auth error from URL:', { error, errorCode, errorDescription });
          navigate('/auth?error=auth_failed&details=' + encodeURIComponent(errorDescription || error));
          return;
        }
        
        logger.debug('Callback params:', { type, tokenHash: !!tokenHash, redirectTo });
        
        // Handle different auth types
        if (type === 'recovery' && tokenHash) {
          // For password reset, verify the session and redirect to reset page
          logger.debug('Handling password recovery callback...');
          
          const { data: { session }, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            logger.error('Password recovery verification error:', error);
            navigate('/auth?error=recovery_failed');
            return;
          }
          
          if (session && session.user) {
            logger.debug('Recovery successful, redirecting to password reset');
            // Extract org slug from redirect_to if present
            if (redirectTo) {
              const orgMatch = redirectTo.match(/mode%3Dreset/);
              if (orgMatch) {
                // Find the org slug in the redirect URL
                const orgSlugMatch = redirectTo.match(/easyroom\.asia%252F([^%]+)%252Fauth/);
                if (orgSlugMatch) {
                  const orgSlug = decodeURIComponent(orgSlugMatch[1]);
                  navigate(`/${orgSlug}/auth?mode=reset`);
                  return;
                }
              }
            }
            navigate(`/auth?mode=reset`);
            return;
          }
        } else {
          // Handle other auth types (signup, invite, etc.)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            logger.error('Auth callback error:', error);
            navigate('/auth?error=callback_failed');
            return;
          }

          if (session && session.user) {
            logger.debug('Auth callback successful, user confirmed:', session.user.email);
            
            // Check for invitation completion first
            if (redirectTo) {
              // Handle both /invite/verify and direct invitation URLs
              if (redirectTo.includes('/invite/verify') || redirectTo.includes('/invite?token=')) {
                let token = null;
                
                if (redirectTo.includes('/invite/verify')) {
                  // Extract token from verify URL
                  const urlObj = new URL(redirectTo, window.location.origin);
                  token = urlObj.searchParams.get('token');
                } else if (redirectTo.includes('/invite?token=')) {
                  // Extract token from direct invite URL
                  const tokenMatch = redirectTo.match(/token=([^&]+)/);
                  token = tokenMatch ? tokenMatch[1] : null;
                }
                
                if (token) {
                  logger.debug('Redirecting to complete invitation with token:', token);
                  navigate(`/complete-invite?token=${token}`);
                  return;
                }
              }
            }
            
            // Check for pending organization redirect
            const pendingOrgSlug = localStorage.getItem('pendingOrgSlug');
            
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