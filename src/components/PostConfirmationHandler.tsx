import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
      } else {
        // Get user's primary organization and redirect there
        const getPrimaryOrg = async () => {
          const { data, error } = await supabase
            .from('user_organization_memberships')
            .select(`
              organization_id,
              organizations!inner(slug)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (data && !error) {
            navigate(`/${data.organizations.slug}`);
          } else {
            // Fallback to landing page if no organization found
            navigate('/');
          }
        };

        getPrimaryOrg();
      }
    }
  }, [user?.email_confirmed_at, user?.id, navigate]);

  return null;
};