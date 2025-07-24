import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, RefreshCw, Building2, AlertCircle } from "lucide-react";

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  tagline?: string;
}

export default function InviteAwaitVerify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const slug = searchParams.get('slug');
  const email = searchParams.get('email');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link - missing token");
      return;
    }

    // Fetch organization data
    fetchOrganizationData();

    // Set up timeout to show resend option after 3 minutes
    const timeout = setTimeout(() => {
      setShowResendOption(true);
    }, 180000); // 3 minutes

    // Set up auth state listener
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change in InviteAwaitVerify:', event, !!session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          clearTimeout(timeout);
          
          try {
            // Accept the invitation
            const { error: acceptError } = await supabase.rpc('accept_invitation_link', {
              invitation_token: token
            });

            if (acceptError) {
              console.error('Accept invitation error:', acceptError);
              
              if (acceptError.message?.includes('INVITE_INVALID')) {
                throw new Error('This invitation link is invalid, expired, or has already been used.');
              } else if (acceptError.message?.includes('AUTH_REQUIRED')) {
                throw new Error('Authentication failed. Please try again.');
              }
              
              throw new Error(`Failed to accept invitation: ${acceptError.message}`);
            }

            toast({
              title: "Welcome!",
              description: `You've successfully joined ${organizationData?.name || 'the organization'}`,
            });

            // Navigate to the organization
            navigate(`/${slug}`);

          } catch (error: any) {
            console.error('Complete invite error:', error);
            setError(error.message || "Failed to complete invitation");
          }
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, [token, slug, navigate, toast, organizationData?.name]);

  const fetchOrganizationData = async () => {
    if (!token) return;

    try {
      const { data, error } = await supabase.rpc('get_invitation_details', {
        invitation_token: token
      });

      if (error || !data) {
        console.error('Failed to fetch organization data:', error);
        return;
      }

      const inviteInfo = data as any;
      setOrganizationData(inviteInfo.organization);

      // Apply organization theme
      if (inviteInfo.organization.primary_color) {
        applyOrganizationTheme(inviteInfo.organization.primary_color);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  // Helper function to apply organization theme
  const applyOrganizationTheme = (primaryColor: string) => {
    try {
      // Convert hex to HSL
      const hsl = hexToHsl(primaryColor);
      
      // Generate color variants
      const primaryForeground = adjustHslLightness(hsl, -45);
      const primaryGlow = adjustHslLightness(hsl, 15);
      const accent = adjustHslLightness(hsl, 10);
      const accentForeground = adjustHslLightness(hsl, -40);

      // Apply CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-foreground', primaryForeground);
      root.style.setProperty('--primary-glow', primaryGlow);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-foreground', accentForeground);

      // Update gradients
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${hsl}), hsl(${primaryGlow}))`);
      
      // Update shadows with the primary color
      root.style.setProperty('--shadow-elegant', `0 10px 30px -10px hsl(${hsl} / 0.3)`);
      root.style.setProperty('--shadow-glow', `0 0 40px hsl(${primaryGlow} / 0.4)`);

    } catch (error) {
      console.error('Error applying organization theme:', error);
    }
  };

  // Helper functions for color conversion
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;

    l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }

      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const adjustHslLightness = (hsl: string, adjustment: number): string => {
    const [h, s, lStr] = hsl.split(' ');
    const l = parseInt(lStr.replace('%', ''));
    const newL = Math.max(0, Math.min(100, l + adjustment));
    return `${h} ${s} ${newL}%`;
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await supabase.auth.refreshSession();
      toast({
        title: "Status refreshed",
        description: "Checking for email confirmation...",
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Invitation Error</h2>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-6">
          {/* Organization Logo and Branding */}
          {organizationData && (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={organizationData.logo_url} alt={organizationData.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{organizationData.name}</h3>
                  {organizationData.tagline && (
                    <p className="text-sm text-muted-foreground">{organizationData.tagline}</p>
                  )}
                </div>
              </div>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          )}
          
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10 relative">
              <Mail className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl">Almost there!</CardTitle>
            <CardDescription className="mt-2">
              We've emailed a confirmation link to{" "}
              <span className="font-medium">{email}</span>. Click it on this device and we'll drop you straight into your workspace.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh status
                </>
              )}
            </Button>
          </div>
          
          {showResendOption && (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>Didn't get it? Check your spam folder or contact support.</p>
            </div>
          )}
          
          <div className="text-center text-xs text-muted-foreground">
            This page will automatically redirect once you confirm your email
          </div>
        </CardContent>
      </Card>
    </div>
  );
}