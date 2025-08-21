import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { PostConfirmationHandler } from "./components/PostConfirmationHandler";
import { OrganizationLayout } from "./components/OrganizationLayout";
import { NavigationErrorBoundary } from "./components/NavigationErrorBoundary";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookings from "./pages/MyBookings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InviteSignup from "./pages/InviteSignup";
import CompleteInvite from "./pages/CompleteInvite";
import InviteRedirect from "./pages/InviteRedirect";
import InviteAwaitVerify from "./pages/InviteAwaitVerify";
import LandingPage from "./pages/LandingPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { SelectOrg } from "./pages/SelectOrg";
import ThankYouPage from "./pages/ThankYouPage";
import FirstRoomOnboarding from "./pages/FirstRoomOnboarding";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminUsers from "./pages/SuperAdminUsers";
import SuperAdminSystem from "./pages/SuperAdminSystem";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import AuthCallback from "./pages/AuthCallback";
import ImpersonationHandler from "./pages/ImpersonationHandler";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { DemoHandler } from "./components/DemoHandler";
import { DemoLayout } from "./components/DemoLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <TooltipProvider>
          <NavigationErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PostConfirmationHandler />
              <ImpersonationBanner />
              <Routes>
                {/* Global routes (no organization context) */}
                <Route path="/demo" element={<DemoHandler />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/thank-you" element={<ThankYouPage />} />
                <Route path="/thank-you/:orgSlug" element={<ThankYouPage />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />
                <Route path="/select-org" element={<SelectOrg />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/users" element={<SuperAdminUsers />} />
        <Route path="/super-admin/system" element={<SuperAdminSystem />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
        <Route path="/super-admin/auth" element={<SuperAdminAuth />} />
        <Route path="/impersonation-handler" element={<ImpersonationHandler />} />
                
                {/* Invite routes - MUST be before organization routes */}
                <Route path="/invite/:shortCode" element={<InviteRedirect />} />
                <Route path="/invite" element={<InviteSignup />} />
                <Route path="/invite/verify" element={<InviteAwaitVerify />} />
                <Route path="/complete-invite" element={<CompleteInvite />} />
                
                {/* Organization-specific auth route */}
                <Route path="/:orgSlug/auth" element={
                  <OrganizationProvider>
                    <Auth />
                  </OrganizationProvider>
                } />
              
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
                    <Route path="onboarding" element={
                      <OrganizationLayout requireAuth={true}>
                        <FirstRoomOnboarding />
                      </OrganizationLayout>
                    } />
                    <Route path="admin" element={
                      <OrganizationLayout requireAuth={true} requireAdmin={true}>
                        <AdminDashboard />
                      </OrganizationLayout>
                    } />
                    <Route path="welcome" element={
                      <OrganizationLayout requireAuth={false} requireAdmin={false}>
                        <WelcomeScreen />
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
