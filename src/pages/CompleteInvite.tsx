import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  tagline?: string;
}

export default function CompleteInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link - missing token");
      setIsProcessing(false);
      return;
    }

    // Set up a timeout to catch any hanging processes
    const timeout = setTimeout(() => {
      if (isProcessing) {
        setError("Processing timeout - please try again");
        setIsProcessing(false);
      }
    }, 30000); // 30 second timeout

    // Wait for user to be signed in after email confirmation
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change in CompleteInvite:', event, !!session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          clearTimeout(timeout);
          
          try {
            // First get the organization info from the invitation
            const { data: inviteData, error: inviteError } = await supabase.rpc('get_invitation_details', {
              invitation_token: token
            });

            if (inviteError || !inviteData) {
              throw new Error('Invalid or expired invitation');
            }

            // Cast the data to our expected structure
            const inviteInfo = inviteData as any;
            setOrganizationData(inviteInfo.organization);

            // Apply organization theme if available
            if (inviteInfo.organization.primary_color) {
              applyOrganizationTheme(inviteInfo.organization.primary_color);
            }

            // Now accept the invitation
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

            setSuccess(true);
            setIsProcessing(false);

            toast({
              title: "Welcome!",
              description: `You've successfully joined ${inviteInfo.organization.name}`,
            });

            // Redirect to the organization after a brief success display
            setTimeout(() => {
              navigate(`/${inviteInfo.organization.slug}`);
            }, 2000);

          } catch (error: any) {
            console.error('Complete invite error:', error);
            setError(error.message || "Failed to complete invitation");
            setIsProcessing(false);
          }
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, [token, navigate, toast, isProcessing]);

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

  if (success && organizationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
              <CardDescription className="mt-2">
                You've successfully joined {organizationData.name}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
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
            <p className="text-sm text-muted-foreground text-center">
              Redirecting you to your workspace...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Completing Your Invitation</h2>
            <p className="text-muted-foreground mt-2">
              Thanks, your email is verified — joining workspace...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}