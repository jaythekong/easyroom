import { Button } from "@/components/ui/button";
import { Zap, Calendar, Rocket } from "lucide-react";

export function DemoConversionBanner() {
  const handleLiveDemo = () => {
    // Open contact form or redirect to booking page
    window.open('https://calendly.com/easyroom-demo', '_blank');
  };

  const handleFreeTrial = () => {
    // Redirect to signup page
    window.location.href = '/auth?mode=signup';
  };

  return (
    <div className="bg-gradient-to-r from-primary to-primary-glow text-white sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">⚡ You're in Sandbox Mode – changes are not saved</span>
            <span className="sm:hidden">⚡ Sandbox Mode</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLiveDemo}
              className="text-xs font-medium bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Calendar className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Schedule a Live Admin Demo</span>
              <span className="sm:hidden">Live Demo</span>
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFreeTrial}
              className="text-xs font-medium bg-white text-primary hover:bg-white/90"
            >
              <Rocket className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Start Free Trial</span>
              <span className="sm:hidden">Free Trial</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}