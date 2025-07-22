import { useState, useEffect, useMemo, useCallback } from "react";
import { RoomCard } from "@/components/RoomCard";
import { EnhancedRoomCard } from "@/components/EnhancedRoomCard";
import { RoomTimeline } from "@/components/RoomTimeline";
import { SearchFilters } from "@/components/SearchFilters";
import { BookingModal } from "@/components/BookingModal";
import { UserMenu } from "@/components/UserMenu";
import { OrganizationClock } from "@/components/OrganizationClock";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, Clock, Users, Settings, Grid3X3, CalendarDays, Building, User } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { useBookings } from "@/hooks/useBookings";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  description?: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  amenities?: string[];
}

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { organization, userRole } = useOrganization();
  useOrganizationTheme(); // Apply organization theme
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Memoize user ID to prevent unnecessary re-fetches
  const userId = useMemo(() => user?.id, [user?.id]);

  useEffect(() => {
    if (userId) {
      fetchRooms();
      fetchUserProfile();
    }
  }, [userId]);

  const fetchRooms = useCallback(async () => {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select(`
          *,
          room_amenities (
            amenities (
              name
            )
          )
        `)
        .eq("status", "active");

      if (roomsError) throw roomsError;

      const formattedRooms = roomsData?.map(room => ({
        ...room,
        amenities: room.room_amenities?.map(ra => ra.amenities.name) || []
      })) || [];

      setRooms(formattedRooms);
      setFilteredRooms(formattedRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast({
        title: "Error",
        description: "Failed to fetch rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch user's bookings for this week
  const { data: userBookings = [] } = useBookings(new Date());
  
  // Count user's personal upcoming bookings
  const personalUpcomingBookings = useMemo(() => {
    const now = new Date();
    return userBookings.filter(booking => 
      booking.user_id === userId && new Date(booking.start_time) > now
    ).length;
  }, [userBookings, userId]);

  // Count organization-wide upcoming bookings
  const organizationUpcomingBookings = useMemo(() => {
    const now = new Date();
    return userBookings.filter(booking => 
      new Date(booking.start_time) > now
    ).length;
  }, [userBookings]);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url, bio, email')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [userId]);

  const getTimeBasedGreeting = () => {
    const timezone = organization?.timezone || 'America/New_York';
    const now = new Date();
    
    // Get current hour in the organization's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone
    });
    
    const hourString = formatter.format(now);
    const hour = parseInt(hourString, 10);
    
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  };

  // Memoize expensive computations
  const userDisplayName = useMemo(() => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.email) return userProfile.email.split('@')[0];
    if (user?.email) return user.email.split('@')[0];
    return "there";
  }, [userProfile?.display_name, userProfile?.email, user?.email]);

  const availableRooms = useMemo(() => rooms.length, [rooms.length]);
  const totalCapacity = useMemo(() => 
    rooms.reduce((sum, room) => sum + room.capacity, 0), 
    [rooms]
  );

  const handleFiltersChange = useCallback((filters: any) => {
    let filtered = [...rooms];

    // Filter by search term
    if (filters.searchTerm) {
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filter by capacity
    if (filters.capacity) {
      filtered = filtered.filter(room => room.capacity >= parseInt(filters.capacity));
    }

    // Filter by amenities
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(room => 
        filters.amenities.every(amenity => (room.amenities || []).includes(amenity))
      );
    }

    setFilteredRooms(filtered);
  }, [rooms]);

  const handleBookRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
    }
  };

  const handleViewDetails = (roomId: string) => {
    // This would navigate to a room details page in a real app
    console.log("View details for room:", roomId);
  };

  const handleBookingConfirm = (booking: any) => {
    setBookings(prev => [...prev, booking]);
    setIsBookingModalOpen(false);
    setSelectedRoom(null);
    setEditingBooking(null);
    // Trigger refresh of timeline data
    setRefreshKey(prev => prev + 1);
  };

  // Moved to memoized values above

  // Prepare rooms for timeline - let RoomTimeline handle the real booking data
  const timelineRooms = rooms.map(room => ({
    ...room,
    amenities: room.amenities || [], // Ensure amenities is always an array
    timeSlots: [] // RoomTimeline will populate this with real data
  }));

  const handleQuickBook = (roomId: string, timeSlot?: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
      toast({
        title: "Quick Book",
        description: `Booking ${room.name}${timeSlot ? ` for ${timeSlot}` : ''}`,
      });
    }
  };

  const handleTimeSlotSelect = (roomId: string, timeSlot: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setSelectedTimeSlot(timeSlot);
      setIsBookingModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div>
                {organization?.logo_url ? (
                  <img src={organization.logo_url} alt={organization.name} className="h-16 w-16 object-contain" />
                ) : (
                  <Building className="h-16 w-16 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">{organization?.name || "Room Booking"}</h1>
                <p className="text-sm text-muted-foreground">{organization?.tagline || "Find and book your perfect meeting space"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <OrganizationClock />
              <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
                <Link to={`/${orgSlug}/my-bookings`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  My Bookings
                </Link>
              </Button>
              <UserMenu 
                profile={userProfile} 
                onProfileUpdate={fetchUserProfile}
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Statistics */}
        <div className="mb-8">
          <div className="glass-card p-6 rounded-2xl mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {getTimeBasedGreeting()}, {userDisplayName}! ☀️
                </h2>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="timeline-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Available Now</span>
                  <p className="text-2xl font-bold text-success">{availableRooms}</p>
                </div>
              </div>
            </div>
            
            <div className="timeline-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Total Rooms</span>
                  <p className="text-2xl font-bold text-foreground">{rooms.length}</p>
                </div>
              </div>
            </div>

            <div className="timeline-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">My Upcoming Bookings</span>
                  <p className="text-2xl font-bold text-foreground">{personalUpcomingBookings}</p>
                </div>
              </div>
            </div>

            <div className="timeline-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Organization Upcoming</span>
                  <p className="text-2xl font-bold text-foreground">{organizationUpcomingBookings}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Timeline View
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Filters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {loading ? (
              <LoadingSkeleton type="timeline" count={3} />
            ) : (
              <RoomTimeline
                rooms={timelineRooms}
                selectedDate={selectedDate}
                onQuickBook={handleQuickBook}
                onTimeSlotSelect={handleTimeSlotSelect}
                onBookingUpdate={() => {
                  setRefreshKey(prev => prev + 1);
                }}
                onDateSelect={setSelectedDate}
                onEditBooking={(booking) => {
                  // Check if booking has room object or room_id
                  const room = booking.room || rooms.find(r => r.id === booking.room_id);
                  if (room) {
                    setSelectedRoom(room);
                    setEditingBooking(booking);
                    setIsBookingModalOpen(true);
                  }
                }}
                expandedRooms={expandedRooms}
                onExpandedRoomsChange={setExpandedRooms}
                refreshTrigger={refreshKey}
              />
            )}
          </TabsContent>

          <TabsContent value="grid" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Available Rooms</h3>
                <p className="text-muted-foreground">
                  Showing {filteredRooms.length} of {rooms.length} rooms
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated {new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton type="room-cards" count={6} />
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No rooms found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to see more options.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                  <EnhancedRoomCard
                    key={room.id}
                    room={{
                      ...room,
                      status: 'available',
                      amenities: room.amenities || []
                    }}
                    onBook={handleBookRoom}
                    onViewDetails={handleViewDetails}
                    onQuickBook={handleQuickBook}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="filters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <SearchFilters onFiltersChange={handleFiltersChange} />
              </div>
              <div className="lg:col-span-2">
                {filteredRooms.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">
                      Found {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {filteredRooms.map((room) => (
                        <EnhancedRoomCard
                          key={room.id}
                          room={{
                            ...room,
                            status: 'available',
                            amenities: room.amenities || []
                          }}
                          onBook={handleBookRoom}
                          onViewDetails={handleViewDetails}
                          showQuickActions={false}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="timeline-card p-8 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No rooms found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters to find available rooms.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedTimeSlot("");
          setEditingBooking(null);
        }}
        room={selectedRoom}
        onBookingConfirm={handleBookingConfirm}
        initialDate={selectedTimeSlot ? new Date(selectedTimeSlot) : undefined}
        initialStartTime={selectedTimeSlot ? new Date(selectedTimeSlot).toTimeString().slice(0, 5) : undefined}
        existingBooking={editingBooking}
      />
    </div>
  );
}