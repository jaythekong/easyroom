import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Calendar, ArrowRight, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function DemoBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  
  // Only show banner when demo=true is in URL or we're in kjil org
  const searchParams = new URLSearchParams(location.search);
  const isDemo = searchParams.get('demo') === 'true' || location.pathname.includes('/kjil');
  
  if (!isDemo || !isVisible) return null;

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleScheduleCall = () => {
    // Open Calendly or contact form
    window.open('https://calendly.com/your-demo-link', '_blank');
  };

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 border-0 rounded-none bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b border-blue-700 shadow-lg">
      <Eye className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">🎯 Demo Mode</span>
            <span className="text-blue-100 text-sm">
              You're exploring KJIL's workspace with sample data
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScheduleCall}
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Schedule Admin Demo
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetStarted}
            className="bg-white hover:bg-white/90 text-blue-600 border-white hover:border-white/90 font-medium"
          >
            Get Started Free
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitDemo}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3 mr-1" />
            Exit Demo
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}