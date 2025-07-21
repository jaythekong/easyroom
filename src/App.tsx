import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { OrganizationLayout } from "./components/OrganizationLayout";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookings from "./pages/MyBookings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InviteSignup from "./pages/InviteSignup";
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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Global routes (no organization context) */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/invite/:token" element={<InviteSignup />} />
              
              {/* Organization-specific routes */}
              <Route path="/:orgSlug/*" element={
                <OrganizationProvider>
                  <Routes>
                    <Route path="/" element={
                      <OrganizationLayout requireAuth={true}>
                        <Index />
                      </OrganizationLayout>
                    } />
                    <Route path="/my-bookings" element={
                      <OrganizationLayout requireAuth={true}>
                        <ProtectedRoute>
                          <MyBookings />
                        </ProtectedRoute>
                      </OrganizationLayout>
                    } />
                    <Route path="/admin" element={
                      <OrganizationLayout requireAuth={true} requireAdmin={true}>
                        <AdminDashboard />
                      </OrganizationLayout>
                    } />
                  </Routes>
                </OrganizationProvider>
              } />
              
              {/* Fallback route for root - redirect to a default org or show 404 */}
              <Route path="/" element={<NotFound />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
