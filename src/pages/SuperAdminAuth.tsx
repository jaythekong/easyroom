import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppFooter } from "@/components/AppFooter";
import { toast } from "sonner";

export default function SuperAdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // If already logged in, redirect to super admin dashboard
  if (user) {
    navigate('/super-admin');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Force token refresh to get updated app_metadata
        await supabase.auth.refreshSession();
        
        // Check if user has super admin claim in app_metadata
        const isSuperAdmin = data.user.app_metadata?.super_admin === true;
        console.log('Login app_metadata:', data.user.app_metadata);
        console.log('isSuperAdmin:', isSuperAdmin);
        
        if (isSuperAdmin) {
          toast.success("Welcome, Super Admin!");
          const redirectTo = searchParams.get('redirectTo') || '/super-admin';
          navigate(redirectTo);
        } else {
          // Sign out immediately if not super admin
          await supabase.auth.signOut();
          toast.error("Access denied. Super admin privileges required.");
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Super Admin Login</CardTitle>
          <p className="text-muted-foreground text-sm">
            Platform Operations Dashboard Access
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Super Admin Access Only</strong>
                  <p className="mt-1">This login is restricted to platform administrators with super admin privileges.</p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate('/')}>
              ← Back to Home
            </Button>
          </div>
          
          <AppFooter />
        </CardContent>
      </Card>
    </div>
  );
}