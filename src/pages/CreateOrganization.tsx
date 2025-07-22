import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const CreateOrganization = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setOrganizationSlug(slug);
    }
  }, [organizationName]);

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
        // Redirect to organization auth page after successful creation
        navigate(`/${organizationSlug}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div>
            <CardTitle className="text-2xl font-bold">Easy Room</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Create your organization account</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrganizationSignUp} className="space-y-4">
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
                <span className="text-sm text-muted-foreground">easyroom.app/</span>
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
            <div className="space-y-2">
              <Label htmlFor="admin-email">Your Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter your email"
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating organization..." : "Create Organization"}
            </Button>
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an organization? <a href="/auth" className="text-primary hover:underline">Sign in here</a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganization;