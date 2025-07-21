import { useState, useEffect } from "react";
import { RoomCard } from "@/components/RoomCard";
import { SearchFilters } from "@/components/SearchFilters";
import { BookingModal } from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Clock, Users, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
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
        filters.amenities.every(amenity => room.amenities.includes(amenity))
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
  };

  // Get current stats
  const availableRooms = rooms.length; // All fetched rooms are active
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Meeting Room Booker</h1>
                <p className="text-sm text-muted-foreground">Find and book your perfect meeting space</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                My Bookings
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
              <Button size="sm">
                <Users className="h-4 w-4 mr-2" />
                Alex Manager
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-foreground">Available Rooms</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{availableRooms}</p>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Total Rooms</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{rooms.length}</p>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Total Capacity</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{totalCapacity}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Search Filters */}
          <div className="lg:col-span-1">
            <SearchFilters onFiltersChange={handleFiltersChange} />
          </div>

          {/* Room Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Available Rooms</h2>
                <p className="text-muted-foreground">
                  Showing {filteredRooms.length} of {rooms.length} rooms
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted h-48 rounded-lg"></div>
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
                  <RoomCard
                    key={room.id}
                    room={{
                      ...room,
                      status: 'available', // Convert to expected format for RoomCard
                      amenities: room.amenities || []
                    }}
                    onBook={handleBookRoom}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        room={selectedRoom}
        onBookingConfirm={handleBookingConfirm}
      />
    </div>
  );
}