import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { toast } from "sonner";

const Auth = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  
  // Only use organization context if we have an orgSlug (organization-specific auth)
  let organization = null;
  let orgLoading = false;
  
  if (orgSlug) {
    const orgContext = useOrganization();
    organization = orgContext.organization;
    orgLoading = orgContext.isLoading;
    useOrganizationTheme(); // Apply organization theme only if we're in org context
  }
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName && !orgSlug) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setOrganizationSlug(slug);
    }
  }, [organizationName, orgSlug]);

  useEffect(() => {
    // Only redirect if user is already logged in AND we're in an organization context
    // For /auth (new org signup), allow logged in users to create new orgs
    if (!orgSlug) return; // Don't redirect on /auth - allow new org creation
    
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const redirectTo = searchParams.get('redirectTo') || `/${orgSlug}`;
          console.log('Auth: User already logged in, redirecting to:', redirectTo);
          navigate(redirectTo);
        }
      } catch (error) {
        console.error('Auth: Error checking session:', error);
      }
    };
    checkUser();
  }, [navigate, searchParams, orgSlug]);

  const handleOrganizationSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First, create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${organizationSlug}`
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (authData.user) {
        // Create the organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            slug: organizationSlug,
          })
          .select()
          .single();

        if (orgError) {
          if (orgError.message.includes('duplicate key')) {
            toast.error("Organization slug already exists. Please choose a different name.");
          } else {
            toast.error("Failed to create organization: " + orgError.message);
          }
          return;
        }

        // Create user profile as admin
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            organization_id: orgData.id,
            email: email,
            role: 'admin'
          });

        if (profileError) {
          toast.error("Failed to create user profile: " + profileError.message);
          return;
        }

        toast.success("Organization created! Check your email for the confirmation link.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const redirectTo = searchParams.get('redirectTo') || '/';
      console.log('Auth: Signing up with redirectTo:', redirectTo);
      const redirectUrl = `${window.location.origin}${redirectTo}`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Check your email for the confirmation link!");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth: Sign in error:', error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please check your credentials.");
        } else {
          toast.error(error.message);
        }
      } else {
        const redirectTo = searchParams.get('redirectTo') || '/';
        console.log('Auth: Sign in successful, redirecting to:', redirectTo);
        navigate(redirectTo);
      }
    } catch (error) {
      console.error('Auth: Unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching organization data
  if (orgSlug && orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {organization && (
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={organization.logo_url} alt={organization.name} />
                <AvatarFallback className="text-lg">
                  {organization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold">{organization.name}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Room Booking System</p>
              </div>
            </div>
          )}
          {!organization && (
            <div>
              <CardTitle className="text-2xl font-bold">EZRoom</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Create your organization account</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={!organization ? handleOrganizationSignUp : handleSignUp} className="space-y-4">
                {!organization && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input
                        id="org-name"
                        type="text"
                        placeholder="Your company name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug">Organization URL</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">ezroom.app/</span>
                        <Input
                          id="org-slug"
                          type="text"
                          placeholder="your-org"
                          value={organizationSlug}
                          onChange={(e) => setOrganizationSlug(e.target.value)}
                          required
                          pattern="[a-z0-9-]+"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Your Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (!organization ? "Creating organization..." : "Creating account...") : (!organization ? "Create Organization" : "Sign Up")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;