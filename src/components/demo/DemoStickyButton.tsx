import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Rocket, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DemoStickyButton() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleCreateOrg = () => {
    window.location.href = '/auth?mode=signup';
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Mock email submission
    toast({
      title: "Request Sent!",
      description: "We'll contact you within 24 hours to schedule your demo.",
    });
    
    setEmail("");
    setShowEmailForm(false);
  };

  return (
    <>
      {/* Main sticky button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          size="lg"
          onClick={handleCreateOrg}
          className="shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary-glow"
        >
          <Rocket className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">🚀 Create Your Own Organization in 2 Minutes</span>
          <span className="sm:hidden">🚀 Get Started</span>
        </Button>
      </div>

      {/* Secondary option - smaller button */}
      <div className="fixed bottom-24 right-6 z-40">
        <Dialog open={showEmailForm} onOpenChange={setShowEmailForm}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card shadow-lg"
            >
              <Mail className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Prefer a guided demo?</span>
              <span className="sm:hidden">Guided Demo</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Request a 1-on-1 Demo
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="demo-email">Your Email Address</Label>
                <Input
                  id="demo-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll contact you within 24 hours to schedule your personalized demo.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Request Demo
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEmailForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}