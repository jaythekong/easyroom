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
      
      // Force refresh the Supabase session
      const { error: refreshError } = await supabase.auth.getSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        setLoading(false);
        return;
      }
      
      try {
        // Get room statistics for current organization
        // Note: RLS only allows viewing 'active' rooms, so we can only count active rooms
        console.log('Fetching active rooms...');
        const { data: activeRooms, error: roomsError } = await supabase
          .from("rooms")
          .select("id")
          .eq("organization_id", organization.id);
        
        if (roomsError) {
          console.error('Error fetching rooms:', roomsError);
        } else {
          console.log('Active rooms fetched:', activeRooms?.length || 0);
        }
        
        console.log('Fetching amenities...');
        const { data: amenities, error: amenitiesError } = await supabase
          .from("amenities")
          .select("id")
          .eq("organization_id", organization.id);
          
        if (amenitiesError) {
          console.error('Error fetching amenities:', amenitiesError);
        } else {
          console.log('Amenities fetched:', amenities?.length || 0);
        }

        // Get booking statistics for current organization
        console.log('Fetching bookings...');
        const { data: allBookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("user_id")
          .eq("organization_id", organization.id);
          
        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          console.log('Bookings fetched:', allBookings?.length || 0);
        }

        // Calculate stats - Note: Due to RLS, we can only see active rooms
        const activeRoomsCount = activeRooms?.length || 0;
        const totalRoomsCount = activeRoomsCount; // RLS limits us to active rooms only
        const totalAmenities = amenities?.length || 0;
        
        // Calculate personal and organization bookings
        const personalBookings = allBookings?.filter(booking => booking.user_id === user?.id).length || 0;
        const organizationBookings = allBookings?.length || 0;

        console.log('Stats calculated:', {
          totalRooms: totalRoomsCount,
          activeRooms: activeRoomsCount, 
          totalAmenities,
          personalBookings,
          organizationBookings
        });

        setStats({
          totalRooms: totalRoomsCount,
          activeRooms: activeRoomsCount,
          totalAmenities,
          personalBookings,
          organizationBookings,
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
  }, [user, organization?.id]);

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