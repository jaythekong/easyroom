import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
              
              {/* Organization-specific auth route */}
              <Route path="/:orgSlug/auth" element={
                <OrganizationProvider>
                  <Auth />
                </OrganizationProvider>
              } />
              <Route path="/invite/:token" element={<InviteSignup />} />
              
              {/* Organization-specific routes */}
              <Route path="/:orgSlug" element={
                <OrganizationProvider>
                  <OrganizationLayout requireAuth={true}>
                    <Index />
                  </OrganizationLayout>
                </OrganizationProvider>
              } />
              <Route path="/:orgSlug/my-bookings" element={
                <OrganizationProvider>
                  <OrganizationLayout requireAuth={true}>
                    <MyBookings />
                  </OrganizationLayout>
                </OrganizationProvider>
              } />
              <Route path="/:orgSlug/admin" element={
                <OrganizationProvider>
                  <OrganizationLayout requireAuth={true} requireAdmin={true}>
                    <AdminDashboard />
                  </OrganizationLayout>
                </OrganizationProvider>
              } />
              
              {/* Default redirect to kampus organization */}
              <Route path="/" element={<Navigate to="/kampus" replace />} />
              
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
