import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DemoDisabled } from "@/components/DemoDisabled";
import { logger } from "@/lib/logger";

export function DemoHandler() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [demoConfig, setDemoConfig] = useState<{ orgSlug: string; userEmail: string; enabled: boolean } | null>(null);

  // Fetch demo configuration
  useEffect(() => {
    const fetchDemoConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('demo_configuration')
          .select(`
            demo_user_id,
            demo_enabled,
            organizations (
              slug
            )
          `)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          logger.error('Failed to fetch demo config:', error);
          return;
        }

        if (data) {
          // Get user email from auth.users
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(data.demo_user_id);
          
          if (authError || !authUser.user) {
            logger.error('Failed to fetch demo user:', authError);
            return;
          }

          setDemoConfig({
            orgSlug: data.organizations?.slug || 'kjil',
            userEmail: authUser.user.email || 'soliyak@gmail.com',
            enabled: data.demo_enabled ?? true
          });
        } else {
          // No config exists - demo is disabled
          setDemoConfig({
            orgSlug: 'kjil',
            userEmail: 'soliyak@gmail.com',
            enabled: false
          });
        }
      } catch (error) {
        logger.error('Error fetching demo config:', error);
        // Error fetching - demo is disabled for safety
        setDemoConfig({
          orgSlug: 'kjil',
          userEmail: 'soliyak@gmail.com',
          enabled: false
        });
      }
    };

    fetchDemoConfig();
  }, []);

  useEffect(() => {
    if (!demoConfig) return;

    // If demo is disabled, don't proceed with authentication
    if (!demoConfig.enabled) return;

    const handleDemoAuth = async () => {
      // If already authenticated as demo user, redirect to demo org
      if (user && user.email === demoConfig.userEmail) {
        navigate(`/${demoConfig.orgSlug}?demo=true`);
        return;
      }

      // If authenticated as different user, sign out first
      if (user && user.email !== demoConfig.userEmail) {
        await supabase.auth.signOut();
      }

      // If not loading and not authenticated, sign in as demo user
      if (!loading && !user) {
        setIsAuthenticating(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: demoConfig.userEmail,
            password: 'Demo@2024!', // This should be made configurable too
          });

          if (error) {
            logger.error('Demo authentication failed:', error);
            // Fallback to auth page if demo login fails
            navigate('/auth?message=Demo temporarily unavailable');
          } else {
            logger.debug('Demo authentication successful');
            // Add demo flag to URL and navigate to demo org
            navigate(`/${demoConfig.orgSlug}?demo=true`);
          }
        } catch (error) {
          logger.error('Demo authentication error:', error);
          navigate('/auth?message=Demo temporarily unavailable');
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    handleDemoAuth();
  }, [user, loading, navigate, demoConfig]);

  // Show disabled message if demo is disabled
  if (demoConfig && !demoConfig.enabled) {
    return <DemoDisabled />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSkeleton type="room-cards" />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Loading Demo Experience</h2>
          <p className="text-muted-foreground">
            {isAuthenticating ? 'Authenticating demo user...' : 'Preparing your demo session...'}
          </p>
        </div>
      </div>
    </div>
  );
}