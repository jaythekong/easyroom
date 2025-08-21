import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";

export function DemoDisabled() {
  const handleContactEmail = () => {
    window.location.href = "mailto:easyroom.asia@gmail.com?subject=Demo Access Request";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <AlertCircle className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Demo Currently Unavailable</CardTitle>
          <CardDescription>
            The live demo is temporarily disabled. Please contact our admin team for access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              For demo access, please reach out to:
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="font-mono text-sm">easyroom.asia@gmail.com</p>
            </div>
          </div>
          
          <Button 
            onClick={handleContactEmail}
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact Admin for Demo
          </Button>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}