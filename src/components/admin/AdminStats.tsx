import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  totalRooms: number;
  activeRooms: number;
  totalAmenities: number;
  bookingsToday: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsData>({
    totalRooms: 0,
    activeRooms: 0,
    totalAmenities: 0,
    bookingsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get room statistics
        const { data: rooms } = await supabase
          .from("rooms")
          .select("status");
        
        const { data: amenities } = await supabase
          .from("amenities")
          .select("id");

        const totalRooms = rooms?.length || 0;
        const activeRooms = rooms?.filter(room => room.status === 'active').length || 0;
        const totalAmenities = amenities?.length || 0;

        setStats({
          totalRooms,
          activeRooms,
          totalAmenities,
          bookingsToday: 0, // Placeholder for future bookings table
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
      title: "Today's Bookings",
      value: stats.bookingsToday,
      icon: Calendar,
      description: "Scheduled for today",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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