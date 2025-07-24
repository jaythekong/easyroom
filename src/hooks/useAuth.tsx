
import { useState, useEffect, createContext, useContext, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user just signed in (email confirmed), clear any loading states
        if (event === 'SIGNED_IN' && session?.user) {
          logger.debug('User confirmed email and signed in');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Auto-refresh session when tab becomes visible (for cross-device confirmations)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.debug('Tab became visible, refreshing session...');
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && (!user || !user.email_confirmed_at)) {
            logger.debug('Session refreshed on tab focus');
            setSession(session);
            setUser(session?.user ?? null);
          }
        });
      }
    };

    // Check session when tab regains focus (for cross-device confirmations)
    const handleFocus = () => {
      logger.debug('Window focused, checking session...');
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && (!user || !user.email_confirmed_at)) {
          logger.debug('Session refreshed on window focus');
          setSession(session);
          setUser(session?.user ?? null);
        }
      });
    };

    // Add event listeners for better cross-device/tab experience
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error("Error signing out:", error.message);
        // If session doesn't exist on server, still clear local state
        if (error.message.includes('session_not_found') || error.message.includes('Session not found')) {
          setSession(null);
          setUser(null);
        }
      }
    } catch (error) {
      logger.error("Unexpected error during sign out:", error);
      // Clear local state even if there's an error
      setSession(null);
      setUser(null);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      logger.debug('Force refreshing authentication session...');
      
      // First try to refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Session refresh failed:', error);
        // If refresh fails, get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          logger.debug('Used current session after refresh failure');
        } else {
          // No valid session at all
          setSession(null);
          setUser(null);
          logger.debug('No valid session found');
        }
      } else if (session) {
        setSession(session);
        setUser(session.user);
        logger.debug('Session refreshed successfully');
      }
    } catch (error) {
      logger.error('Force refresh failed:', error);
      setSession(null);
      setUser(null);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
    forceRefresh,
  }), [user, session, loading, signOut, forceRefresh]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
