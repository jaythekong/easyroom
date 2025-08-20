
import { memo } from "react";
import { Plus, Settings, Users, Calendar, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomManagement } from "@/components/admin/RoomManagement";
import { AdminStats } from "@/components/admin/AdminStats";
import { TeamManagement } from "@/components/admin/TeamManagement";
import { OrganizationSettings } from "@/components/admin/OrganizationSettings";
import { TelegramNotifications } from "@/components/admin/TelegramNotifications";
import { TickerManagement } from "@/components/admin/TickerManagement";
import { WelcomeScreenManagement } from "@/components/admin/WelcomeScreenManagement";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";

const AdminDashboardContent = memo(function AdminDashboardContent() {
  useOrganizationTheme(); // Apply organization theme
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage rooms, view analytics, and configure your meeting room booking system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link to={`../`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <AdminStats />

        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="ticker" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Ticker
            </TabsTrigger>
            <TabsTrigger value="welcome" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Welcome Screen
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <RoomManagement />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>
                  View and manage all meeting room bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Booking management features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Reports</CardTitle>
                <CardDescription>
                  View detailed analytics and generate reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram" className="space-y-6">
            <TelegramNotifications />
          </TabsContent>

          <TabsContent value="ticker" className="space-y-6">
            <TickerManagement />
          </TabsContent>

          <TabsContent value="welcome" className="space-y-6">
            <WelcomeScreenManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <OrganizationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}
