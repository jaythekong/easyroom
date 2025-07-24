import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const { user, forceRefresh } = useAuth();
  const { organization } = useOrganization();
  const [stats, setStats] = useState<StatsData>({
    totalRooms: 0,
    activeRooms: 0,
    totalAmenities: 0,
    personalBookings: 0,
    organizationBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!organization?.id) {
        console.log('No organization ID available');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('No user available - authentication required');
        setLoading(false);
        return;
      }
      
      console.log('Fetching admin stats for organization:', organization.id);
      console.log('Current user:', user.id);
      
      try {
        // CRITICAL: Force refresh authentication context to sync with database
        console.log('Forcing authentication refresh...');
        await forceRefresh();
        
        // Small delay to ensure auth context is properly set
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Auth refreshed, calling get_organization_stats function...');
        const { data: orgStats, error: statsError } = await supabase
          .rpc('get_organization_stats', { 
            org_id: organization.id 
          });
        
        if (statsError) {
          console.error('Error fetching organization stats:', statsError);
          throw statsError;
        }

        console.log('Organization stats received:', orgStats);

        // Cast to proper type
        const stats = orgStats as unknown as OrganizationStats;

        // Get amenities count separately if needed
        console.log('Fetching amenities count...');
        const { data: amenities, error: amenitiesError } = await supabase
          .from("amenities")
          .select("id", { count: 'exact' })
          .eq("organization_id", organization.id);
          
        if (amenitiesError) {
          console.error('Error fetching amenities:', amenitiesError);
        }

        // Calculate personal bookings
        const personalBookingsCount = await supabase
          .from("bookings")
          .select("id", { count: 'exact' })
          .eq("organization_id", organization.id)
          .eq("user_id", user.id);

        const personalBookings = personalBookingsCount.data?.length || 0;
        const totalAmenities = amenities?.length || 0;

        console.log('Final stats calculated:', {
          totalRooms: stats.rooms,
          activeRooms: stats.rooms, // Function returns all rooms
          totalAmenities,
          personalBookings,
          organizationBookings: stats.total_bookings
        });

        setStats({
          totalRooms: stats.rooms || 0,
          activeRooms: stats.rooms || 0, // Assuming all rooms from function are active
          totalAmenities,
          personalBookings,
          organizationBookings: stats.total_bookings || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Set stats to show something even on error
        setStats({
          totalRooms: 0,
          activeRooms: 0,
          totalAmenities: 0,
          personalBookings: 0,
          organizationBookings: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && organization?.id) {
      fetchStats();
    } else {
      console.log('Missing user or organization:', { user: !!user, orgId: organization?.id });
      setLoading(false);
    }
  }, [user, organization?.id, forceRefresh]);

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