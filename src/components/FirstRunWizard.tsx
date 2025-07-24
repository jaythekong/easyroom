import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Building, 
  MapPin, 
  Users, 
  Mail, 
  Plus, 
  X, 
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FirstRunWizardProps {
  organizationId: string;
  organizationSlug: string;
  userRole: 'admin' | 'member';
  onComplete: () => void;
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  adminOnly?: boolean;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Brand Your Organization",
    description: "Upload logo and choose your brand colors",
    adminOnly: true
  },
  {
    id: 2,
    title: "Create First Room",
    description: "Add your first meeting room",
    adminOnly: true
  },
  {
    id: 3,
    title: "Invite Your Team",
    description: "Send invitations to your teammates",
    adminOnly: true
  }
];

export function FirstRunWizard({ organizationId, organizationSlug, userRole, onComplete }: FirstRunWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 - Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ea580c");

  // Step 2 - First Room
  const [roomName, setRoomName] = useState("Boardroom A");
  const [roomCapacity, setRoomCapacity] = useState("8");
  const [roomLocation, setRoomLocation] = useState("");
  const [roomDescription, setRoomDescription] = useState("");

  // Step 3 - Team Invites
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);

  // Skip all steps for members
  if (userRole !== 'admin') {
    onComplete();
    return null;
  }

  const availableSteps = WIZARD_STEPS.filter(step => !step.adminOnly || userRole === 'admin');
  const maxSteps = availableSteps.length;

  const handleNext = async () => {
    if (currentStep === maxSteps) {
      await handleComplete();
    } else {
      await handleStepSave();
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleStepSave = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 1) {
        // Save branding
        await supabase
          .from('organizations')
          .update({
            logo_url: logoUrl || null,
            primary_color: primaryColor
          })
          .eq('id', organizationId);
      } else if (currentStep === 2) {
        // Create first room
        if (roomName.trim()) {
          await supabase
            .from('rooms')
            .insert({
              name: roomName,
              capacity: parseInt(roomCapacity) || 8,
              location: roomLocation || null,
              description: roomDescription || null,
              organization_id: organizationId
            });
        }
      } else if (currentStep === 3) {
        // Send invitations
        const validEmails = inviteEmails.filter(email => 
          email.trim() && email.includes('@')
        );
        
        if (validEmails.length > 0) {
          await supabase
            .from('invitations')
            .insert(
              validEmails.map(email => ({
                email: email.trim(),
                organization_id: organizationId,
                role: 'member' as const,
                invited_by: organizationId // Will be replaced by auth.uid() in DB
              }))
            );
        }
      }
    } catch (error) {
      console.error('Step save error:', error);
      toast({
        title: "Error",
        description: "Failed to save step data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await handleStepSave();
      
      // Mark wizard as completed in localStorage
      localStorage.setItem(`wizard_completed_${organizationId}`, 'true');
      
      toast({
        title: "🎉 Setup Complete!",
        description: "Your organization is ready to use",
      });

      onComplete();
    } catch (error) {
      console.error('Wizard completion error:', error);
      toast({
        title: "Error",
        description: "Failed to complete setup",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, ""]);
  };

  const removeEmailField = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const updateEmailField = (index: number, value: string) => {
    const updated = [...inviteEmails];
    updated[index] = value;
    setInviteEmails(updated);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="logo">Organization Logo URL (optional)</Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload your logo to a service like Imgur or use a direct URL
              </p>
            </div>

            <div>
              <Label htmlFor="color">Primary Brand Color</Label>
              <div className="flex gap-3 mt-2">
                <Input
                  id="color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#ea580c"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="font-medium">Preview</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This color will be used for buttons, links, and accents throughout your organization
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Conference Room A, Boardroom"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  placeholder="Floor 2, Building A"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Equipped with projector, whiteboard..."
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Team Member Emails</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Invite your teammates to join the organization
              </p>
              
              <div className="space-y-3">
                {inviteEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={email}
                      onChange={(e) => updateEmailField(index, e.target.value)}
                    />
                    {inviteEmails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEmailField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Email
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> Invitations will be sent after setup is complete. 
                You can always invite more people later from the admin dashboard.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = availableSteps[currentStep - 1];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Setup Your Organization</CardTitle>
              <p className="text-muted-foreground mt-1">
                Step {currentStep} of {maxSteps}: {currentStepData?.title}
              </p>
            </div>
            <Badge variant="outline">
              {Math.round((currentStep / maxSteps) * 100)}% Complete
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(currentStep / maxSteps) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{currentStepData?.title}</h3>
            <p className="text-muted-foreground">{currentStepData?.description}</p>
          </div>

          <Separator />

          {renderStepContent()}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button 
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                "Saving..."
              ) : currentStep === maxSteps ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}