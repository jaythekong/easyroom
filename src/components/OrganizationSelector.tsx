import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building, Users, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export function OrganizationSelector() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      if (user) {
        // Get organizations the user belongs to
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select(`
            organization_id,
            role,
            organizations (
              id,
              name,
              slug,
              created_at
            )
          `)
          .eq('user_id', user.id);

        if (profilesError) throw profilesError;

        const userOrgs = profiles
          ?.map(profile => profile.organizations as unknown as Organization)
          .filter(Boolean) || [];

        setUserOrganizations(userOrgs);
      }

      // Get all public organizations (for demo purposes)
      const { data: allOrgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .limit(5);

      if (orgsError) throw orgsError;

      setOrganizations(allOrgs || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to Roomer</h1>
            <p className="text-muted-foreground mt-2">
              Select an organization to access room booking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!user && (
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* User's Organizations */}
          {user && userOrganizations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Organizations
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {userOrganizations.map((org) => (
                  <Card key={org.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {org.name}
                        </CardTitle>
                        <Badge variant="secondary">Member</Badge>
                      </div>
                      <CardDescription>
                        Access at: {window.location.origin}/{org.slug}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Member since {new Date(org.created_at).toLocaleDateString()}
                        </span>
                        <Button asChild>
                          <Link to={`/${org.slug}`}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Book Rooms
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Organizations */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Available Organizations
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {organizations.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {org.name}
                    </CardTitle>
                    <CardDescription>
                      Access at: {window.location.origin}/{org.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Created {new Date(org.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="outline" asChild>
                        <Link to={`/${org.slug}`}>
                          Visit
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          {!user && (
            <Card className="border-dashed">
              <CardContent className="text-center p-8">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Need an account?</h3>
                <p className="text-muted-foreground mb-4">
                  Sign in to access your organization's room booking system
                </p>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}