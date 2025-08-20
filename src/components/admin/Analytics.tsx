import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  Activity,
  PieChart,
  LineChart,
  Zap,
  MapPin,
  Timer,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

interface BookingAnalytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  upcomingBookings: number;
  averageBookingDuration: number;
  peakHours: { hour: number; count: number }[];
  roomUtilization: { roomId: string; roomName: string; utilizationRate: number; totalBookings: number }[];
  weeklyTrend: { week: string; bookings: number }[];
  monthlyStats: { month: string; bookings: number; users: number }[];
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  topBookers: { userId: string; displayName: string; email: string; bookingCount: number }[];
  userGrowth: { month: string; newUsers: number; totalUsers: number }[];
}

interface RoomAnalytics {
  totalRooms: number;
  activeRooms: number;
  mostPopularRoom: { id: string; name: string; bookingCount: number };
  leastUsedRoom: { id: string; name: string; bookingCount: number };
  averageCapacity: number;
  capacityUtilization: { capacity: number; roomCount: number; utilizationRate: number }[];
}

export function Analytics() {
  const { organization } = useOrganization();
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [bookingAnalytics, setBookingAnalytics] = useState<BookingAnalytics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [roomAnalytics, setRoomAnalytics] = useState<RoomAnalytics | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    fetchAnalytics();
  }, [organization?.id, timeRange]);

  const fetchAnalytics = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchBookingAnalytics(),
        fetchUserAnalytics(),
        fetchRoomAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingAnalytics = async () => {
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        created_at,
        room_id,
        rooms!inner(name)
      `)
      .eq('organization_id', organization.id)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Calculate analytics
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const now = new Date();
    const upcomingBookings = bookings?.filter(b => new Date(b.start_time) > now && b.status === 'confirmed').length || 0;

    // Average duration
    const durations = bookings?.map(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    }) || [];
    const averageBookingDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Peak hours
    const hourCounts: { [key: number]: number } = {};
    bookings?.forEach(booking => {
      const hour = new Date(booking.start_time).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Room utilization
    const roomBookings: { [key: string]: { name: string; count: number } } = {};
    bookings?.forEach(booking => {
      const roomId = booking.room_id;
      const roomName = booking.rooms?.name || 'Unknown Room';
      if (!roomBookings[roomId]) {
        roomBookings[roomId] = { name: roomName, count: 0 };
      }
      roomBookings[roomId].count++;
    });

    const maxBookings = Math.max(...Object.values(roomBookings).map(r => r.count), 1);
    const roomUtilization = Object.entries(roomBookings).map(([roomId, data]) => ({
      roomId,
      roomName: data.name,
      totalBookings: data.count,
      utilizationRate: Math.round((data.count / maxBookings) * 100)
    }));

    setBookingAnalytics({
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      upcomingBookings,
      averageBookingDuration,
      peakHours,
      roomUtilization,
      weeklyTrend: [], // Simplified for now
      monthlyStats: []
    });
  };

  const fetchUserAnalytics = async () => {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name, created_at')
      .eq('organization_id', organization.id);

    if (error) throw error;

    const totalUsers = profiles?.length || 0;
    
    // Get users who made bookings in the last 30 days (active users)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('organization_id', organization.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUserIds = new Set(recentBookings?.map(b => b.user_id) || []);
    const activeUsers = activeUserIds.size;

    // New users this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newUsersThisMonth = profiles?.filter(p => new Date(p.created_at) >= thisMonth).length || 0;

    // Top bookers
    const { data: bookingCounts } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('organization_id', organization.id);

    const userBookingCounts: { [key: string]: number } = {};
    bookingCounts?.forEach(booking => {
      userBookingCounts[booking.user_id] = (userBookingCounts[booking.user_id] || 0) + 1;
    });

    const topBookers = Object.entries(userBookingCounts)
      .map(([userId, count]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          userId,
          displayName: profile?.display_name || 'Unknown User',
          email: profile?.email || '',
          bookingCount: count
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10);

    setUserAnalytics({
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      topBookers,
      userGrowth: []
    });
  };

  const fetchRoomAnalytics = async () => {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name, capacity, status')
      .eq('organization_id', organization.id);

    if (error) throw error;

    const totalRooms = rooms?.length || 0;
    const activeRooms = rooms?.filter(r => r.status === 'active').length || 0;
    const averageCapacity = rooms?.length ? Math.round(rooms.reduce((sum, room) => sum + room.capacity, 0) / rooms.length) : 0;

    // Get booking counts per room
    const { data: bookingCounts } = await supabase
      .from('bookings')
      .select('room_id')
      .eq('organization_id', organization.id);

    const roomBookingCounts: { [key: string]: number } = {};
    bookingCounts?.forEach(booking => {
      roomBookingCounts[booking.room_id] = (roomBookingCounts[booking.room_id] || 0) + 1;
    });

    const roomsWithCounts = rooms?.map(room => ({
      ...room,
      bookingCount: roomBookingCounts[room.id] || 0
    })) || [];

    const mostPopularRoom = roomsWithCounts.reduce((max, room) => 
      room.bookingCount > max.bookingCount ? room : max, roomsWithCounts[0] || { id: '', name: 'No rooms', bookingCount: 0 });

    const leastUsedRoom = roomsWithCounts.reduce((min, room) => 
      room.bookingCount < min.bookingCount ? room : min, roomsWithCounts[0] || { id: '', name: 'No rooms', bookingCount: 0 });

    setRoomAnalytics({
      totalRooms,
      activeRooms,
      mostPopularRoom: { id: mostPopularRoom.id, name: mostPopularRoom.name, bookingCount: mostPopularRoom.bookingCount },
      leastUsedRoom: { id: leastUsedRoom.id, name: leastUsedRoom.name, bookingCount: leastUsedRoom.bookingCount },
      averageCapacity,
      capacityUtilization: []
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your meeting room usage and team activity
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingAnalytics?.totalBookings || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {bookingAnalytics?.confirmedBookings || 0} confirmed
              </Badge>
              <Badge variant="outline" className="text-xs">
                {bookingAnalytics?.upcomingBookings || 0} upcoming
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userAnalytics?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {userAnalytics?.totalUsers || 0} total users
            </p>
            <Progress 
              value={userAnalytics?.totalUsers ? (userAnalytics.activeUsers / userAnalytics.totalUsers) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roomAnalytics?.activeRooms || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {roomAnalytics?.totalRooms || 0} total rooms active
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Avg capacity: {roomAnalytics?.averageCapacity || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingAnalytics?.averageBookingDuration || 0}m</div>
            <p className="text-xs text-muted-foreground">
              Average meeting length
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bookings">Booking Insights</TabsTrigger>
          <TabsTrigger value="rooms">Room Performance</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Peak Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingAnalytics?.peakHours.slice(0, 5).map((peak, index) => (
                    <div key={peak.hour} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatHour(peak.hour)}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(peak.count / (bookingAnalytics.peakHours[0]?.count || 1)) * 100} className="w-20" />
                        <span className="text-sm text-muted-foreground">{peak.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Booking Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Confirmed</span>
                    </div>
                    <span className="font-medium">{bookingAnalytics?.confirmedBookings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Cancelled</span>
                    </div>
                    <span className="font-medium">{bookingAnalytics?.cancelledBookings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Upcoming</span>
                    </div>
                    <span className="font-medium">{bookingAnalytics?.upcomingBookings || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Room Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingAnalytics?.roomUtilization.slice(0, 5).map((room, index) => (
                    <div key={room.roomId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{room.roomName}</span>
                        <span className="text-sm text-muted-foreground">{room.totalBookings} bookings</span>
                      </div>
                      <Progress value={room.utilizationRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Room Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Most Popular</p>
                      <p className="text-xs text-muted-foreground">
                        {roomAnalytics?.mostPopularRoom.name} ({roomAnalytics?.mostPopularRoom.bookingCount} bookings)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Least Used</p>
                      <p className="text-xs text-muted-foreground">
                        {roomAnalytics?.leastUsedRoom.name} ({roomAnalytics?.leastUsedRoom.bookingCount} bookings)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Top Bookers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userAnalytics?.topBookers.slice(0, 10).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.bookingCount}</p>
                      <p className="text-xs text-muted-foreground">bookings</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Usage Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Trend analysis coming soon. This will include booking patterns, 
                  seasonal usage, and predictive insights.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}