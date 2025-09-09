import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdatePrompt(true);
      }
    };

    // Check for existing service worker
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleSWUpdate(registration);
              }
            });
          }
        });

        // Check if there's already a waiting worker
        if (registration.waiting) {
          handleSWUpdate(registration);
        }
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        setShowUpdatePrompt(true);
      }
    });

  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      waitingWorker.addEventListener('statechange', () => {
        if (waitingWorker.state === 'activated') {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    toast.info('Update available - refresh to get the latest version');
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <Card className="p-4 bg-background/95 backdrop-blur-sm border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-500/10 rounded-lg">
            <RefreshCw className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              Update Available
            </h3>
            <p className="text-xs text-muted-foreground">
              A new version of Easy Room is ready
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs"
            >
              Later
            </Button>
            <Button
              onClick={handleUpdate}
              size="sm"
              className="text-xs"
            >
              Update
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}