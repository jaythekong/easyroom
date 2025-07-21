import { useState, useEffect } from "react";
import { RoomCard } from "@/components/RoomCard";
import { EnhancedRoomCard } from "@/components/EnhancedRoomCard";
import { RoomTimeline } from "@/components/RoomTimeline";
import { SearchFilters } from "@/components/SearchFilters";
import { BookingModal } from "@/components/BookingModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, Clock, Users, Settings, Grid3X3, CalendarDays, Zap, Coffee, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    
    // Refresh data when user returns to the page
    const handleFocus = () => {
      fetchRooms();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchRooms = async () => {
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
  };

  const handleFiltersChange = (filters: any) => {
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
  };

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
    // Refresh rooms data to update timeline
    fetchRooms();
  };

  const availableRooms = rooms.length; // All fetched rooms are active
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

  // Mock timeline data for demonstration - now with hourly slots
  const timelineRooms = rooms.map(room => ({
    ...room,
    amenities: room.amenities || [], // Ensure amenities is always an array
    timeSlots: Array.from({ length: 14 }, (_, i) => { // 8 AM to 10 PM = 14 hours
      const hour = i + 8;
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      // Mock some bookings for demonstration
      const isBooked = Math.random() > 0.7;
      return {
        time,
        endTime,
        available: !isBooked,
        meeting: isBooked ? 'Team Meeting' : undefined,
        bookedBy: isBooked ? 'John Doe' : undefined,
      };
    })
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
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Meeting Room Booker</h1>
                <p className="text-sm text-muted-foreground">Find and book your perfect meeting space</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user ? `Welcome, ${user.email}` : "Not signed in"}
              </span>
              <ThemeToggle />
              <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
                <Link to="/my-bookings">
                  <Calendar className="h-4 w-4 mr-2" />
                  My Bookings
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
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
                  Good morning, Alex! ☀️
                </h2>
                <p className="text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button className="quick-book-button">
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Book
                </Button>
                <Button variant="outline">
                  <Coffee className="h-4 w-4 mr-2" />
                  Coffee Break
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Users className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Total Capacity</span>
                  <p className="text-2xl font-bold text-foreground">{totalCapacity}</p>
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
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <RoomTimeline
                rooms={timelineRooms}
                selectedDate={selectedDate}
                onQuickBook={handleQuickBook}
                onTimeSlotSelect={handleTimeSlotSelect}
                onBookingUpdate={fetchRooms}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted h-64 rounded-lg"></div>
                  </div>
                ))}
              </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <SearchFilters onFiltersChange={handleFiltersChange} />
              </div>
              <div className="lg:col-span-3">
                <div className="timeline-card p-6 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Use filters to find rooms</h3>
                  <p className="text-muted-foreground">
                    Set your preferences on the left to see filtered results here.
                  </p>
                </div>
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