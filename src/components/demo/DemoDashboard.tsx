import { useState, useEffect, useMemo, useCallback } from "react";
import { RoomCard } from "@/components/RoomCard";
import { EnhancedRoomCard } from "@/components/EnhancedRoomCard";
import { DemoRoomTimeline } from "@/components/demo/DemoRoomTimeline";
import { DemoOrganizationClock } from "@/components/demo/DemoOrganizationClock";
import { SearchFilters } from "@/components/SearchFilters";
import { BookingModal } from "@/components/BookingModal";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, Clock, Users, Grid3X3, CalendarDays, Building, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { useDemoContext } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function DemoDashboard() {
  const demoContext = useDemoContext();
  const { organization, user, userProfile, userRole, rooms, bookings, createBooking } = demoContext;
  const { toast } = useToast();

  const [filteredRooms, setFilteredRooms] = useState(rooms);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [editingBooking, setEditingBooking] = useState<any>(null);

  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good afternoon";
    if (currentHour < 21) return "Good Evening";
    return "Good Night";
  };

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

  const handleFiltersChange = useCallback(async (filters: any) => {
    let filtered = [...rooms];

    // Filter by selected room first
    if (filters.selectedRoom && filters.selectedRoom !== "all") {
      filtered = filtered.filter(room => room.id === filters.selectedRoom);
    }
    // Then filter by search term
    else if (filters.searchTerm && filters.searchTerm.trim()) {
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filter by capacity
    if (filters.capacity && filters.capacity !== "any") {
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
    console.log("View details for room:", roomId);
  };

  const handleBookingConfirm = (booking: any) => {
    createBooking(booking);
    setIsBookingModalOpen(false);
    setSelectedRoom(null);
    setEditingBooking(null);
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "Demo Booking Created! ✨",
      description: "This is a demo booking - not saved to real database",
    });
  };

  const timelineRooms = rooms.map(room => ({
    ...room,
    amenities: room.amenities || [],
    timeSlots: [],
    status: 'available' as const
  }));

  const handleTimeSlotSelect = (roomId: string, timeSlot: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      const timeSlotDate = new Date(timeSlot);
      const timeString = timeSlot.split('T')[1]?.slice(0, 5);
      
      setSelectedTimeSlot(timeString || "");
      setCurrentTimeSlot(timeSlot);
      setIsBookingModalOpen(true);
    }
  };

  const handleQuickBook = (roomId: string, timeSlot?: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
      toast({
        title: "Demo Quick Book",
        description: `Booking ${room.name}${timeSlot ? ` for ${timeSlot}` : ''}`,
      });
    }
  };

  // Mock stats for demo
  const totalBookingStats = {
    personalTotal: bookings.filter(b => b.user_id === user?.id).length,
    organizationTotal: bookings.length,
    loading: false
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-12 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {organization?.logo_url ? (
                  <img src={organization.logo_url} alt={organization.name} className="h-8 w-8 sm:h-12 sm:w-12 object-contain rounded-lg" />
                ) : (
                  <Building className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold gradient-text truncate">{organization?.name || "Demo Organization"}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{organization?.tagline || "Demo room booking experience"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <div className="hidden md:block">
                <DemoOrganizationClock />
              </div>
              <UserMenu 
                profile={userProfile} 
                onProfileUpdate={() => {}}
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section with Statistics */}
        <div className="mb-4 sm:mb-8">
          <div className="glass-card p-3 sm:p-6 rounded-2xl mb-3 sm:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
                  {getTimeBasedGreeting()}, {userDisplayName}! ☀️
                </h2>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium inline-block">
                  ✨ Demo Mode - Try booking a room!
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-sm"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </Button>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Available Rooms</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">{availableRooms}</div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Capacity</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">{totalCapacity}</div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">My Bookings</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                {totalBookingStats.personalTotal}
              </div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Org Total</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                {totalBookingStats.organizationTotal}
              </div>
            </div>
          </div>
        </div>

        {/* Demo banner for Telegram integration */}
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <div className="font-medium text-foreground">
                  📱 Get instant booking alerts in Telegram
                </div>
                <div className="text-sm text-muted-foreground">
                  Connect once — we'll DM you when rooms are booked or cancelled. (Demo feature)
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Demo Mode
            </Button>
          </div>
        </div>

        {/* Search Filters */}
        <div className="mb-6">
          <SearchFilters 
            rooms={rooms}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Grid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            <DemoRoomTimeline
              rooms={timelineRooms}
              selectedDate={selectedDate}
              onQuickBook={handleQuickBook}
              onTimeSlotSelect={handleTimeSlotSelect}
              onBookingUpdate={() => setRefreshKey(prev => prev + 1)}
              onDateSelect={setSelectedDate}
              expandedRooms={expandedRooms}
              onExpandedRoomsChange={setExpandedRooms}
              refreshTrigger={refreshKey}
            />
          </TabsContent>

          <TabsContent value="grid" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <EnhancedRoomCard
                  key={room.id}
                  room={{
                    ...room,
                    status: 'available' as const,
                    nextAvailable: undefined,
                    currentMeeting: undefined
                  }}
                  onBook={handleBookRoom}
                  onViewDetails={handleViewDetails}
                  onQuickBook={handleQuickBook}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && selectedRoom && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedRoom(null);
            setEditingBooking(null);
          }}
          room={selectedRoom}
          onBookingConfirm={handleBookingConfirm}
          initialDate={selectedDate}
          initialStartTime={selectedTimeSlot}
          existingBooking={editingBooking}
        />
      )}
    </div>
  );
}