import { useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/use-mobile';

export function InstallPrompt() {
  const { showInstallPrompt, installApp, dismissInstallPrompt, isInstallable } = usePWAInstall();
  const isMobile = useIsMobile();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!showInstallPrompt || !isInstallable) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return isMobile 
        ? "Tap the menu (⋮) and select 'Add to Home screen'"
        : "Click the install icon in the address bar";
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return "Tap the Share button and select 'Add to Home Screen'";
    } else if (userAgent.includes('firefox')) {
      return isMobile
        ? "Tap the menu (⋮) and select 'Install'"
        : "Click the install icon in the address bar";
    } else if (userAgent.includes('edg')) {
      return isMobile
        ? "Tap the menu (⋯) and select 'Add to phone'"
        : "Click the install icon in the address bar";
    }
    
    return "Look for an install option in your browser menu";
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <Card className="p-4 bg-background/95 backdrop-blur-sm border shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground mb-1">
              Install Easy Room
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get the app for faster access and better experience
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleInstall}
                disabled={isInstalling}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Download className="w-4 h-4 mr-2" />
                {isInstalling ? 'Installing...' : 'Install App'}
              </Button>
              
              <details className="sm:hidden">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Manual installation
                </summary>
                <p className="text-xs text-muted-foreground mt-1">
                  {getInstallInstructions()}
                </p>
              </details>
            </div>
            
            <p className="hidden sm:block text-xs text-muted-foreground mt-2">
              Or {getInstallInstructions()}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissInstallPrompt}
            className="flex-shrink-0 p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}