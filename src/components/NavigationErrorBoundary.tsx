import { memo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  console.error('Navigation Error:', error);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="text-destructive">⚠️</div>
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground mt-2">
              Please try refreshing the page.
            </p>
          </div>
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
}

export const NavigationErrorBoundary = memo(function NavigationErrorBoundary({ 
  children 
}: NavigationErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Navigation error caught by boundary:', error, errorInfo);
      }}
      onReset={() => {
        // Clear any cached queries that might be causing issues
        window.location.reload();
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});