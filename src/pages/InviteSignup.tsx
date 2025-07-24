import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

interface InviteData {
  email: string;
  role: string;
  organization_id: string;
  expires_at: string;
  accepted_at?: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function InviteSignup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
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
    if (!token) return;

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          organizations!inner(
            id,
            name,
            slug
          )
        `)
        .eq('invite_token', token)
        .is('accepted_at', null)
        .single();

      if (error) {
        setError("Invalid or expired invitation link");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      setInviteData(data as any);
      // Check if it's a link invite (email starts with "link-" or is empty)
      const isLinkInvite = !data.email || data.email.startsWith('link-');
      if (isLinkInvite) {
        setEmail(""); // User will need to enter their email
      } else {
        setEmail(data.email);
      }
    } catch (error) {
      setError("Failed to load invitation details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!inviteData || !password || !email) return;

    // Security Check: If invite has specific email, ensure it matches
    if (inviteData.email && !inviteData.email.startsWith('link-') && inviteData.email !== email) {
      setError("This invitation is for a different email address.");
      return;
    }

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
      // Get organization slug for redirect
      const orgSlug = inviteData.organizations?.slug;
      if (!orgSlug) {
        throw new Error("Organization information not found");
      }

      // Sign up the user with organization-specific redirect
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${orgSlug}`
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          throw authError;
        }
        return;
      }

      if (authData.user) {
        try {
          // Create user_organization_membership (required by your spec)
          const { error: membershipError } = await supabase
            .from('user_organization_memberships')
            .insert({
              user_id: authData.user.id,
              organization_id: inviteData.organization_id,
              role: inviteData.role as 'admin' | 'member'
            });

          if (membershipError) throw membershipError;

          // Create user profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: authData.user.id,
              organization_id: inviteData.organization_id,
              role: inviteData.role as 'admin' | 'member',
              email: email,
            });

          if (profileError) throw profileError;

          // Mark invitation as accepted
          const { error: inviteError } = await supabase
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('invite_token', token);

          if (inviteError) console.error('Failed to mark invite as accepted:', inviteError);

          // Audit log: invite_accept
          await supabase
            .from('platform_audit_log')
            .insert({
              user_id: authData.user.id,
              organization_id: inviteData.organization_id,
              action: 'invite_accept',
              metadata: {
                invite_token: token,
                role: inviteData.role,
                invited_email: inviteData.email
              }
            });

          toast({
            title: "Welcome to the team!",
            description: "Please check your email to confirm your account.",
          });

          // Store org slug for post-confirmation redirect
          localStorage.setItem('pendingOrgSlug', orgSlug);

        } catch (dbError: any) {
          // Clean up auth user if database operations fail
          await supabase.auth.signOut();
          throw new Error(`Account setup failed: ${dbError.message}`);
        }
      }
    } catch (error: any) {
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
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Join the Team</CardTitle>
            <CardDescription className="mt-2">
              You've been invited to join as a{" "}
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