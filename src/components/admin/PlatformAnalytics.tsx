import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformStats } from "@/hooks/useSuperAdmin";
import { Building2, Users, MapPin, Calendar, TrendingUp, AlertTriangle, Activity, BarChart3 } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export function PlatformAnalytics() {
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return <LoadingSkeleton type="stats" />;
  }

  const metrics = [
    {
      title: "Organizations",
      value: stats?.total_organizations || 0,
      icon: Building2,
      gradient: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      subtitle: `${stats?.active_organizations || 0} active, ${stats?.suspended_organizations || 0} suspended`
    },
    {
      title: "Platform Users",
      value: stats?.total_users || 0,
      icon: Users,
      gradient: "from-blue-500/20 to-blue-500/5",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      subtitle: "Across all organizations"
    },
    {
      title: "Meeting Rooms",
      value: stats?.total_rooms || 0,
      icon: MapPin,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      subtitle: "Available spaces"
    },
    {
      title: "Total Bookings",
      value: stats?.total_bookings || 0,
      icon: Calendar,
      gradient: "from-purple-500/20 to-purple-500/5",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
      subtitle: "All-time reservations"
    },
    {
      title: "Active Orgs",
      value: stats?.active_organizations || 0,
      icon: Activity,
      gradient: "from-green-500/20 to-green-500/5",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      subtitle: "Currently operational"
    },
    {
      title: "Suspended",
      value: stats?.suspended_organizations || 0,
      icon: AlertTriangle,
      gradient: "from-red-500/20 to-red-500/5",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-600",
      subtitle: "Temporarily disabled"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Platform Analytics</h2>
          <p className="text-muted-foreground">Real-time platform statistics and insights</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card 
              key={metric.title} 
              className={`glass-card hover-scale border-0 bg-gradient-to-br ${metric.gradient} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                </div>
                <div className={`p-2.5 rounded-xl ${metric.iconBg} border border-white/10`}>
                  <IconComponent className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold tracking-tight">
                  {metric.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {metric.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}