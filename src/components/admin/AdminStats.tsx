import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, Calendar, TrendingUp, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";

interface StatsData {
  totalRooms: number;
  activeRooms: number;
  totalAmenities: number;
  personalBookings: number;
  organizationBookings: number;
}

interface OrganizationStats {
  users: number;
  rooms: number;
  bookings_30_days: number;
  total_bookings: number;
}

export function AdminStats() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [stats, setStats] = useState<StatsData>({
    totalRooms: 0,
    activeRooms: 0,
    totalAmenities: 0,
    personalBookings: 0,
    organizationBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    const fetchStats = async () => {
      // Prevent concurrent requests
      if (fetchInProgressRef.current || !organization?.id || !user?.id) {
        return;
      }

      fetchInProgressRef.current = true;
      setLoading(true);
      
      try {
        // Fetch all data in parallel with proper error handling
        const [orgStatsResult, amenitiesResult, personalBookingsResult] = await Promise.allSettled([
          supabase.rpc('get_organization_stats', { org_id: organization.id }),
          supabase.from("amenities").select("id", { count: 'exact' }).eq("organization_id", organization.id),
          supabase.from("bookings").select("id", { count: 'exact' }).eq("organization_id", organization.id).eq("user_id", user.id)
        ]);

        // Extract data with fallbacks
        const orgStats = orgStatsResult.status === 'fulfilled' ? (orgStatsResult.value.data as unknown as OrganizationStats) : null;
        const amenities = amenitiesResult.status === 'fulfilled' ? amenitiesResult.value.data : [];
        const personalBookings = personalBookingsResult.status === 'fulfilled' ? personalBookingsResult.value.data : [];

        // Log errors for debugging
        if (orgStatsResult.status === 'rejected') console.error('Org stats error:', orgStatsResult.reason);
        if (amenitiesResult.status === 'rejected') console.error('Amenities error:', amenitiesResult.reason);
        if (personalBookingsResult.status === 'rejected') console.error('Personal bookings error:', personalBookingsResult.reason);

        const finalStats = {
          totalRooms: orgStats?.rooms || 0,
          activeRooms: orgStats?.rooms || 0,
          totalAmenities: amenities?.length || 0,
          personalBookings: personalBookings?.length || 0,
          organizationBookings: orgStats?.total_bookings || 0,
        };

        setStats(finalStats);
      } catch (error) {
        console.error("Error in fetchStats:", error);
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    };

    fetchStats();
  }, [user?.id, organization?.id]);

  const statsCards = [
    {
      title: "Total Rooms",
      value: stats.totalRooms,
      icon: Building,
      description: "All configured rooms",
    },
    {
      title: "Active Rooms",
      value: stats.activeRooms,
      icon: TrendingUp,
      description: "Currently bookable",
    },
    {
      title: "Amenities",
      value: stats.totalAmenities,
      icon: Users,
      description: "Available equipment",
    },
    {
      title: "My Bookings",
      value: stats.personalBookings,
      icon: User,
      description: "Your personal bookings",
    },
    {
      title: "Organization Bookings",
      value: stats.organizationBookings,
      icon: Building2,
      description: "All team bookings",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}