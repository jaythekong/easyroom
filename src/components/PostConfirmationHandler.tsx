import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const PostConfirmationHandler = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email_confirmed_at) {
      const pendingOrgSlug = localStorage.getItem('pendingOrgSlug');
      
      if (pendingOrgSlug) {
        // Clear the stored slug
        localStorage.removeItem('pendingOrgSlug');
        
        // Redirect to the onboarding page for the new organization
        navigate(`/${pendingOrgSlug}/onboarding`);
      }
    }
  }, [user?.email_confirmed_at, navigate]);

  return null;
};