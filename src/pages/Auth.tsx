import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Building, Users, Calendar, ArrowRight, Sparkles } from "lucide-react";
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
  const [orgSubdomain, setOrgSubdomain] = useState("");
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

  const handleOrganizationRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Check if organization exists
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', orgSubdomain)
        .single();
      
      if (error || !data) {
        toast.error("Organization not found. Please check the subdomain and try again.");
        setLoading(false);
        return;
      }
      
      // Redirect to organization auth page
      navigate(`/${orgSubdomain}`);
    } catch (error) {
      toast.error("An error occurred while searching for the organization.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen gap-12">
          {/* Left side - Welcome content (only show on /auth route) */}
          {!orgSlug && (
            <div className="flex-1 max-w-lg text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Easy Room
                </h1>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Smart Room Booking for Modern Teams
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Transform how your team books meeting rooms with our intuitive platform. 
                Get started in minutes and say goodbye to booking conflicts forever.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Easy Booking</h3>
                  <p className="text-sm text-muted-foreground">Book rooms in seconds with our intuitive interface</p>
                </div>
                
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Team Management</h3>
                  <p className="text-sm text-muted-foreground">Invite team members and manage permissions</p>
                </div>
                
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Smart Features</h3>
                  <p className="text-sm text-muted-foreground">Real-time availability and conflict prevention</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Right side - Auth forms */}
          <div className="flex-1 w-full max-w-md">
            <Card className="w-full border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-6">
                {organization && (
                  <div className="flex flex-col items-center space-y-3">
                    <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                      <AvatarImage src={organization.logo_url} alt={organization.name} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {organization.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl font-bold">{organization.name}</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">Room Booking System</p>
                    </div>
                  </div>
                )}
                {!organization && !orgSlug && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Building className="h-6 w-6 text-primary" />
                      <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    </div>
                    <p className="text-muted-foreground">Find your organization to continue</p>
                  </div>
                )}
                {!organization && orgSlug && (
                  <div>
                    <CardTitle className="text-2xl font-bold">Join Easy Room</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">Create your account to get started</p>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {!orgSlug ? (
                  // Organization finder with integrated signup
                  <Tabs defaultValue="find" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="find">Find Organization</TabsTrigger>
                      <TabsTrigger value="create">Create New</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="find" className="space-y-4 mt-6">
                      <form onSubmit={handleOrganizationRedirect} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="org-subdomain">Your Organization</Label>
                          <div className="relative">
                            <Input
                              id="org-subdomain"
                              type="text"
                              placeholder="acme-corp"
                              value={orgSubdomain}
                              onChange={(e) => setOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              required
                              className="pr-32"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              .easyroom.app
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter your organization's subdomain to sign in
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Finding organization...
                            </>
                          ) : (
                            <>
                              Continue to Sign In
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="create" className="space-y-4 mt-6">
                      <div className="text-center py-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Start Your Free Organization</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Set up your team's room booking system in under 2 minutes
                        </p>
                      </div>
                      
                      <form onSubmit={handleOrganizationSignUp} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <Input
                              id="org-name"
                              type="text"
                              placeholder="Acme Corporation"
                              value={organizationName}
                              onChange={(e) => setOrganizationName(e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="org-slug">Your URL</Label>
                            <div className="relative">
                              <Input
                                id="org-slug"
                                type="text"
                                placeholder="acme-corp"
                                value={organizationSlug}
                                onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                required
                                className="pr-32"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                .easyroom.app
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="admin-email">Your Email</Label>
                            <Input
                              id="admin-email"
                              type="email"
                              placeholder="you@company.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="admin-password">Password</Label>
                            <Input
                              id="admin-password"
                              type="password"
                              placeholder="Create a secure password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={6}
                            />
                          </div>
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating your organization...
                            </>
                          ) : (
                            <>
                              Create Organization
                              <Sparkles className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          By creating an account, you agree to our Terms of Service and Privacy Policy
                        </p>
                      </form>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Existing organization-specific auth tabs
                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="signin">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="signin" className="space-y-4 mt-6">
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
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="signup" className="space-y-4 mt-6">
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
                              <div className="relative">
                                <Input
                                  id="org-slug"
                                  type="text"
                                  placeholder="your-org"
                                  value={organizationSlug}
                                  onChange={(e) => setOrganizationSlug(e.target.value)}
                                  required
                                  className="pr-32"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  .easyroom.app
                                </span>
                              </div>
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
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {!organization ? "Creating organization..." : "Creating account..."}
                            </>
                          ) : (
                            !organization ? "Create Organization" : "Sign Up"
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;