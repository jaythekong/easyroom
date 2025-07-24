import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, AlertCircle, Building2 } from "lucide-react";

interface InviteData {
  email: string;
  role: string;
  organization_id: string;
  expires_at: string;
  accepted_at?: string;
}

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  tagline?: string;
}

export default function InviteSignup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      fetchInviteData();
    }
  }, [token]);

  const fetchInviteData = async () => {
    if (!token) {
      console.log('[InviteSignup] No token provided');
      return;
    }

    console.log('[InviteSignup] Fetching invite data for token:', token);

    try {
      const { data, error } = await supabase.rpc('get_invitation_details', {
        invitation_token: token
      });

      console.log('[InviteSignup] RPC response:', { data, error });

      if (error) {
        console.error('[InviteSignup] RPC error:', error);
        setError("Invalid or expired invitation link");
        return;
      }

      if (!data) {
        console.log('[InviteSignup] No data returned from RPC');
        setError("Invalid or expired invitation link");
        return;
      }

      // Cast the data to our expected interface
      const inviteInfo = data as any;

      // Set invitation data
      setInviteData({
        email: inviteInfo.email,
        role: inviteInfo.role,
        organization_id: inviteInfo.organization.id,
        expires_at: inviteInfo.expires_at
      });

      // Set organization data  
      setOrganizationData({
        id: inviteInfo.organization.id,
        name: inviteInfo.organization.name,
        slug: inviteInfo.organization.slug,
        logo_url: inviteInfo.organization.logo_url,
        primary_color: inviteInfo.organization.primary_color,
        tagline: inviteInfo.organization.tagline
      });

      // Apply organization theme
      if (inviteInfo.organization.primary_color) {
        applyOrganizationTheme(inviteInfo.organization.primary_color);
      }
      
      // Check if it's a link invite (email starts with "link-" or is empty)
      const isLinkInvite = !inviteInfo.email || inviteInfo.email.startsWith('link-');
      if (isLinkInvite) {
        setEmail(""); // User will need to enter their email
      } else {
        setEmail(inviteInfo.email);
      }
    } catch (error) {
      setError("Failed to load invitation details");
    } finally {
      setIsLoading(false);
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

  // Helper functions for color conversion (same as in useOrganizationTheme)
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

  const handleSignup = async () => {
    if (!inviteData || !password || !email) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSigningUp(true);
    setError("");

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // FIRST: Create organization membership (required for RLS)
        const { error: membershipError } = await supabase
          .from('user_organization_memberships')
          .insert({
            user_id: authData.user.id,
            organization_id: inviteData.organization_id,
            role: inviteData.role as 'admin' | 'member'
          });

        if (membershipError) {
          console.error('Membership creation error:', membershipError);
          throw new Error(`Failed to create organization membership: ${membershipError.message}`);
        }

        // THEN: Create user profile (now RLS will pass)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            organization_id: inviteData.organization_id,
            role: inviteData.role as 'admin' | 'member',
            email: email,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        // FINALLY: Mark invitation as accepted
        const { error: inviteError } = await supabase
          .from('invitations')
          .update({ 
            accepted_at: new Date().toISOString(),
            status: 'accepted'
          })
          .eq('invite_token', token);

        if (inviteError) {
          console.error('Failed to mark invite as accepted:', inviteError);
          // Don't throw here - user is already created successfully
        }

        toast({
          title: "Welcome!",
          description: "Your account has been created successfully",
        });

        navigate("/");
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || "Failed to create account");
    } finally {
      setIsSigningUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Invalid Invitation</h2>
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

  if (!inviteData) {
    return null;
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
            <div className="p-3 rounded-full bg-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Join the Team</CardTitle>
            <CardDescription className="mt-2">
              You've been invited to join{organizationData ? ` ${organizationData.name}` : ""} as a{" "}
              <span className="font-medium capitalize">{inviteData.role}</span>
              {!inviteData.email?.startsWith('link-') && inviteData.email ? ` for ${inviteData.email}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={(!inviteData.email?.startsWith('link-') && inviteData.email) ? inviteData.email : "Enter your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!inviteData.email?.startsWith('link-') && !!inviteData.email}
              className={(!inviteData.email?.startsWith('link-') && !!inviteData.email) ? "bg-muted" : ""}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            onClick={handleSignup}
            disabled={isSigningUp || !password || !confirmPassword || !email}
            className="w-full"
          >
            {isSigningUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account & Join Team"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Invitation expires on {new Date(inviteData.expires_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}