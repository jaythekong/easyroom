import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { OrganizationLayout } from "./components/OrganizationLayout";
import { NavigationErrorBoundary } from "./components/NavigationErrorBoundary";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookings from "./pages/MyBookings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InviteSignup from "./pages/InviteSignup";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <TooltipProvider>
          <NavigationErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Global routes (no organization context) */}
                <Route path="/auth" element={<Auth />} />
                
              {/* Organization-specific auth route */}
              <Route path="/:orgSlug/auth" element={
                <OrganizationProvider>
                  <Auth />
                </OrganizationProvider>
              } />
              <Route path="/invite/:token" element={<InviteSignup />} />
              
              {/* All organization-specific routes under one provider */}
              <Route path="/:orgSlug/*" element={
                <OrganizationProvider>
                  <Routes>
                    <Route path="" element={
                      <OrganizationLayout requireAuth={true}>
                        <Index />
                      </OrganizationLayout>
                    } />
                    <Route path="my-bookings" element={
                      <OrganizationLayout requireAuth={true}>
                        <MyBookings />
                      </OrganizationLayout>
                    } />
                    <Route path="admin" element={
                      <OrganizationLayout requireAuth={true} requireAdmin={true}>
                        <AdminDashboard />
                      </OrganizationLayout>
                    } />
                  </Routes>
                </OrganizationProvider>
              } />
                
                {/* Landing page */}
                <Route path="/" element={<LandingPage />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NavigationErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
