import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Building2, AlertCircle, ExternalLink, Copy, Zap, Sparkles } from "lucide-react";

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
  
  const [showResendOption, setShowResendOption] = useState(false);
  const [error, setError] = useState("");
  const [orgUrlCopied, setOrgUrlCopied] = useState(false);

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
              
              // If invitation is invalid/expired/used, redirect to home instead of showing error
              if (acceptError.message?.includes('INVITE_INVALID')) {
                console.log('Invitation already processed, redirecting to home with welcome');
                toast({
                  title: "Email confirmed!",
                  description: "Your email has been confirmed successfully.",
                });
                navigate(`/${organizationData?.slug || slug}?welcome=true`);
                return;
              } else if (acceptError.message?.includes('AUTH_REQUIRED')) {
                throw new Error('Authentication failed. Please try again.');
              }
              
              throw new Error(`Failed to accept invitation: ${acceptError.message}`);
            }

            toast({
              title: "Welcome!",
              description: `You've successfully joined ${organizationData?.name || 'the organization'}`,
            });

            // Navigate to the organization with welcome parameter
            navigate(`/${slug}?welcome=true`);

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


  const handleCopyOrgUrl = async () => {
    if (!slug) return;
    
    const orgUrl = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(orgUrl);
      setOrgUrlCopied(true);
      toast({
        title: "Link copied!",
        description: "Organization link copied to clipboard",
      });
      setTimeout(() => setOrgUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleGoToOrg = () => {
    if (!slug) return;
    window.open(`/${slug}`, '_blank');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/20">
        <CardContent className="p-8 text-center space-y-8">
          {/* Organization Logo and Branding */}
          {organizationData && (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
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
            </div>
          )}
          
          {/* Exciting Icon with Animations */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary/20 to-primary/40" />
            </div>
            <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center">
              <Mail className="h-10 w-10 text-white animate-bounce" />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
            </div>
          </div>
          
          {/* Exciting Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500 animate-pulse" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                You're almost in!
              </h1>
              <Zap className="h-6 w-6 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">One final step...</p>
          </div>
          
          {/* Clear Email CTA */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Check your email!</h2>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                📧 {email}
              </p>
              <p className="text-sm text-muted-foreground">
                Click the magic link we just sent you
              </p>
            </div>
          </div>
          
          {/* Minimal Footer */}
          <div className="text-xs text-muted-foreground opacity-70">
            ✨ This page will redirect automatically once you click the link
          </div>
          
          {showResendOption && (
            <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t border-primary/10">
              <p>📬 Still waiting? Check your spam folder!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}