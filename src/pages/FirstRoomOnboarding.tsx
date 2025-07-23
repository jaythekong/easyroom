import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Building2, Users, MapPin, FileText, ArrowRight, SkipForward } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function FirstRoomOnboarding() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    location: "",
    description: ""
  });

  if (!organization) {
    return <LoadingSkeleton type="room-cards" />;
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organization) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .insert({
          name: formData.name,
          capacity: parseInt(formData.capacity),
          location: formData.location || null,
          description: formData.description || null,
          organization_id: organization.id,
          status: 'active'
        });

      if (error) throw error;

      toast("Room created successfully!");
      navigate(`/${orgSlug}`);
    } catch (error) {
      console.error('Error creating room:', error);
      toast("Failed to create room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(`/${orgSlug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to {organization.name}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's start by creating your first meeting room
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Create Your First Room
            </CardTitle>
            <CardDescription>
              Set up a meeting room that your team can book and use for their meetings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Room Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Conference Room A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Capacity *
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="e.g., 8"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., 2nd Floor, Building A"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add details about equipment, features, or special instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name || !formData.capacity}
                  className="flex-1 flex items-center gap-2"
                >
                  {isLoading ? (
                    "Creating..."
                  ) : (
                    <>
                      Create Room
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            You can always add more rooms later from the admin dashboard
          </p>
        </div>
      </div>
    </div>
  );
}