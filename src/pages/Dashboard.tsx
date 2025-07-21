import { useState, useEffect } from "react";
import { RoomCard } from "@/components/RoomCard";
import { SearchFilters } from "@/components/SearchFilters";
import { BookingModal } from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Clock, Users } from "lucide-react";

// Mock data - in a real app, this would come from an API
const mockRooms = [
  {
    id: "room-1",
    name: "Conference Room A",
    capacity: 8,
    status: 'available' as const,
    location: "2nd Floor, East Wing",
    amenities: ["Monitor", "Video Conferencing", "Whiteboard", "WiFi"]
  },
  {
    id: "room-2", 
    name: "Meeting Room B",
    capacity: 6,
    status: 'busy' as const,
    currentMeeting: "Marketing Strategy Session",
    location: "1st Floor, West Wing",
    amenities: ["Projector", "WiFi", "Coffee Machine"]
  },
  {
    id: "room-3",
    name: "Executive Boardroom",
    capacity: 12,
    status: 'upcoming' as const,
    nextAvailable: "2:30 PM",
    location: "3rd Floor, Center",
    amenities: ["Monitor", "Video Conferencing", "Whiteboard", "WiFi", "Coffee Machine"]
  },
  {
    id: "room-4",
    name: "Small Meeting Room",
    capacity: 4,
    status: 'available' as const,
    location: "1st Floor, East Wing",
    amenities: ["Monitor", "WiFi"]
  },
  {
    id: "room-5",
    name: "Training Room",
    capacity: 20,
    status: 'available' as const,
    location: "2nd Floor, West Wing",
    amenities: ["Projector", "Whiteboard", "WiFi", "Coffee Machine"]
  },
  {
    id: "room-6",
    name: "Phone Booth 1",
    capacity: 2,
    status: 'busy' as const,
    currentMeeting: "Client Call",
    location: "1st Floor, Center",
    amenities: ["WiFi"]
  }
];

export default function Dashboard() {
  const [rooms, setRooms] = useState(mockRooms);
  const [filteredRooms, setFilteredRooms] = useState(mockRooms);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

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
  const availableRooms = rooms.filter(r => r.status === 'available').length;
  const busyRooms = rooms.filter(r => r.status === 'busy').length;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-foreground">Available Now</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{availableRooms}</p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-danger rounded-full"></div>
              <span className="text-sm font-medium text-foreground">In Use</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{busyRooms}</p>
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

            {filteredRooms.length === 0 ? (
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
                    room={room}
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