import { useState, useEffect, useMemo } from "react";
import { DemoRoomCard } from "@/components/demo/DemoRoomCard";
import { DemoRoomTimeline } from "@/components/demo/DemoRoomTimeline";
import { DemoBookingModal } from "@/components/demo/DemoBookingModal";
import { DemoWelcomeScreen } from "@/components/demo/DemoWelcomeScreen";
import { DemoConversionBanner } from "@/components/demo/DemoConversionBanner";
import { DemoStickyButton } from "@/components/demo/DemoStickyButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, Eye, Grid3X3 } from "lucide-react";
import { useDemoData } from "@/hooks/useDemoData";

export default function DemoPage() {
  const {
    rooms,
    bookings,
    createBooking,
    updateBooking,
    deleteBooking,
    welcomeSettings
  } = useDemoData();

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);

  const handleBookRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
    }
  };

  const handleBookingConfirm = (bookingData: any) => {
    if (editingBooking) {
      updateBooking(editingBooking.id, bookingData);
    } else {
      createBooking({
        ...bookingData,
        room_id: selectedRoom?.id,
        user_id: 'demo-user',
        organization_id: 'demo-org'
      });
    }
    setIsBookingModalOpen(false);
    setSelectedRoom(null);
    setEditingBooking(null);
  };

  const handleTimeSlotSelect = (roomId: string, timeSlot: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      const timeString = timeSlot.split('T')[1]?.slice(0, 5);
      setSelectedTimeSlot(timeString || "");
      setIsBookingModalOpen(true);
    }
  };

  const handleEditBooking = (booking: any) => {
    const room = rooms.find(r => r.id === booking.room_id);
    if (room) {
      setSelectedRoom(room);
      setEditingBooking(booking);
      setIsBookingModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Conversion Banner */}
      <DemoConversionBanner />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-12 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold gradient-text truncate">EasyRoom Demo</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">Experience room booking made easy</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWelcomePreview(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Welcome Screen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-8">
          <div className="glass-card p-3 sm:p-6 rounded-2xl mb-3 sm:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
                  Welcome to EasyRoom! 🚀
                </h2>
                <p className="text-sm text-muted-foreground">
                  Try booking a room, explore the timeline, and see how easy room management can be.
                </p>
              </div>
            </div>
          </div>

          {/* Demo Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Available Rooms</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">{rooms.length}</div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Demo Bookings</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">{bookings.length}</div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Capacity</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                {rooms.reduce((sum, room) => sum + room.capacity, 0)} people
              </div>
            </div>

            <div className="timeline-card p-3 sm:p-4 group relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Demo Mode</span>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-primary">Active</div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="rooms" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <DemoRoomCard
                  key={room.id}
                  room={room}
                  onBook={handleBookRoom}
                  onViewDetails={() => handleBookRoom(room.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <DemoRoomTimeline
              rooms={rooms}
              bookings={bookings}
              selectedDate={selectedDate}
              onQuickBook={handleTimeSlotSelect}
              onTimeSlotSelect={handleTimeSlotSelect}
              onDateSelect={setSelectedDate}
              onEditBooking={handleEditBooking}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && selectedRoom && (
        <DemoBookingModal
          room={selectedRoom}
          onConfirm={handleBookingConfirm}
          onCancel={() => {
            setIsBookingModalOpen(false);
            setSelectedRoom(null);
            setEditingBooking(null);
          }}
          initialDate={selectedDate}
          initialTimeSlot={selectedTimeSlot}
          editingBooking={editingBooking}
        />
      )}

      {/* Welcome Screen Preview */}
      {showWelcomePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[80vh] bg-background rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWelcomePreview(false)}
              className="absolute top-4 right-4 z-10"
            >
              ✕ Close
            </Button>
            <DemoWelcomeScreen settings={welcomeSettings} />
          </div>
        </div>
      )}

      {/* Sticky Conversion Button */}
      <DemoStickyButton />
    </div>
  );
}