import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export const PostConfirmationHandler = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasHandledConfirmation, setHasHandledConfirmation] = useState(false);

  useEffect(() => {
    // Only handle confirmation once per session
    if (hasHandledConfirmation) return;
    
    if (user?.email_confirmed_at && session) {
      // Mark as handled immediately to prevent infinite loops
      setHasHandledConfirmation(true);
      
      logger.debug('Email confirmed, checking for pending redirects...');
      
      const pendingOrgSlug = localStorage.getItem('pendingOrgSlug');
      
      if (pendingOrgSlug) {
        logger.debug('Found pending org slug, redirecting to onboarding:', pendingOrgSlug);
        
        // Clear the stored slug
        localStorage.removeItem('pendingOrgSlug');
        
        // Redirect to the onboarding page for the new organization
        navigate(`/${pendingOrgSlug}/onboarding`);
        return;
      }
      
      // If user is on an auth page and just confirmed, redirect appropriately
      if (location.pathname.includes('/auth') || location.pathname === '/') {
        logger.debug('User confirmed email on auth page, checking for appropriate redirect...');
        logger.debug('User confirmed, auth flow will handle redirect');
      }
    }
  }, [user?.email_confirmed_at, session, navigate, location.pathname, hasHandledConfirmation]);

  // Reset the handler when user signs out
  useEffect(() => {
    if (!user) {
      setHasHandledConfirmation(false);
    }
  }, [user]);

  return null;
};