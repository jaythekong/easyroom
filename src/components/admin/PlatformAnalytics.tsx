import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformStats } from "@/hooks/useSuperAdmin";
import { Building2, Users, MapPin, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export function PlatformAnalytics() {
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return <LoadingSkeleton type="stats" />;
  }

  const metrics = [
    {
      title: "Total Organizations",
      value: stats?.total_organizations || 0,
      icon: Building2,
      color: "text-primary"
    },
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Total Rooms",
      value: stats?.total_rooms || 0,
      icon: MapPin,
      color: "text-green-600"
    },
    {
      title: "Total Bookings",
      value: stats?.total_bookings || 0,
      icon: Calendar,
      color: "text-purple-600"
    },
    {
      title: "Active Organizations",
      value: stats?.active_organizations || 0,
      icon: TrendingUp,
      color: "text-emerald-600"
    },
    {
      title: "Suspended Organizations",
      value: stats?.suspended_organizations || 0,
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {metrics.map((metric) => {
        const IconComponent = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <IconComponent className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}