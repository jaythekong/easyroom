import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Loader2 } from "lucide-react";

export function SelectOrg() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_organization_memberships')
        .select(`
          organization_id,
          role,
          organizations!inner(
            id,
            name,
            slug,
            logo_url,
            tagline
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading your organizations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">No Organizations</h2>
              <p className="text-muted-foreground mt-2">
                You don't belong to any organizations yet.
              </p>
            </div>
            <Button onClick={() => navigate('/auth')}>
              Create Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Select Organization</h1>
          <p className="text-muted-foreground mt-2">
            Choose which organization you'd like to access
          </p>
        </div>
        
        <div className="grid gap-4">
          {organizations.map((membership) => {
            const org = membership.organizations;
            return (
              <Card 
                key={org.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/${org.slug}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded" />
                        ) : (
                          <Building2 className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{org.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {org.tagline || `Role: ${membership.role}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}