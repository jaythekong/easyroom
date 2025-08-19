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
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!organization?.id || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Use the organization stats function
        const { data: orgStats, error: statsError } = await supabase
          .rpc('get_organization_stats', { 
            org_id: organization.id 
          });
        
        if (statsError) {
          console.error('Error fetching organization stats:', statsError);
          throw statsError;
        }

        const stats = orgStats as unknown as OrganizationStats;

        // Get amenities count
        const { data: amenities, error: amenitiesError } = await supabase
          .from("amenities")
          .select("id", { count: 'exact' })
          .eq("organization_id", organization.id);
          
        if (amenitiesError) {
          console.error('Error fetching amenities:', amenitiesError);
        }

        // Get personal bookings count
        const { data: personalBookings, error: personalError } = await supabase
          .from("bookings")
          .select("id", { count: 'exact' })
          .eq("organization_id", organization.id)
          .eq("user_id", user.id);

        if (personalError) {
          console.error('Error fetching personal bookings:', personalError);
        }

        const finalStats = {
          totalRooms: stats.rooms || 0,
          activeRooms: stats.rooms || 0,
          totalAmenities: amenities?.length || 0,
          personalBookings: personalBookings?.length || 0,
          organizationBookings: stats.total_bookings || 0,
        };

        setStats(finalStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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