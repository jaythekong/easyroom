import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { logger } from "@/lib/logger";

export function DemoHandler() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const handleDemoAuth = async () => {
      // If already authenticated as demo user, redirect to kjil
      if (user && user.email === 'soliyak@gmail.com') {
        navigate('/kjil?demo=true');
        return;
      }

      // If authenticated as different user, sign out first
      if (user && user.email !== 'soliyak@gmail.com') {
        await supabase.auth.signOut();
      }

      // If not loading and not authenticated, sign in as demo user
      if (!loading && !user) {
        setIsAuthenticating(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: 'soliyak@gmail.com',
            password: 'Demo@2024!',
          });

          if (error) {
            logger.error('Demo authentication failed:', error);
            // Fallback to auth page if demo login fails
            navigate('/auth?message=Demo temporarily unavailable');
          } else {
            logger.debug('Demo authentication successful');
            // Add demo flag to URL and navigate to kjil
            navigate('/kjil?demo=true');
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
  }, [user, loading, navigate]);

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