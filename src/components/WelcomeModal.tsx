import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Bookmark, 
  MessageSquare, 
  CheckCircle,
  Clock,
  Users,
  X
} from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectTelegram: () => void;
  organizationName: string;
  orgSlug: string;
}

export function WelcomeModal({ 
  isOpen, 
  onClose, 
  onConnectTelegram, 
  organizationName,
  orgSlug 
}: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Your Room Booking System! 🎉",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Welcome to {organizationName}
            </h3>
            <p className="text-muted-foreground">
              You're all set! Let's get you started with a quick tour of the key features.
            </p>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Important: Bookmark This Page</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Save this URL for easy access: <code className="bg-muted px-1 rounded text-xs">/{orgSlug}</code>
            </p>
          </div>
        </div>
      )
    },
    {
      title: "How to Book a Room 📅",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">Browse Available Rooms</p>
                <p className="text-sm text-muted-foreground">View rooms in Timeline or Grid view</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">Select Date & Time</p>
                <p className="text-sm text-muted-foreground">Use filters to find available slots</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Click "Book Now"</p>
                <p className="text-sm text-muted-foreground">Fill in details and confirm your booking</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Clock className="h-4 w-4" />
            <span>Business hours: 8:00 AM - 10:00 PM</span>
          </div>
        </div>
      )
    },
    {
      title: "Get Instant Telegram Alerts 📱",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <MessageSquare className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Get instant booking alerts in Telegram
              </h3>
              <p className="text-muted-foreground mb-4">
                Connect once – we'll dm you when rooms are booked or cancelled.
              </p>
              
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Real-time booking notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Cancellation alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Room availability updates</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onConnectTelegram} 
            className="w-full"
            size="lg"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Connect to Telegram
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            You can always connect later from the main dashboard
          </p>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {steps[currentStep].title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicators */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[300px]">
            {steps[currentStep].content}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1"
            >
              Previous
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleFinish} className="flex-1">
                Get Started
              </Button>
            ) : (
              <Button onClick={nextStep} className="flex-1">
                Next
              </Button>
            )}
          </div>
          
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}