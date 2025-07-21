import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap, Calendar, ChevronLeft, ChevronRight, Expand, Minimize, Wrench, CalendarIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, addDays as addDaysUtil, subDays } from "date-fns";
import { BookingDetailsModal } from "@/components/BookingDetailsModal";
import { useBookings, useDowntime } from "@/hooks/useBookings";
import { useOrganization } from "@/contexts/OrganizationContext";

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  meeting?: string;
  bookedBy?: string;
  date?: string;
  bookingId?: string;
  isDowntime?: boolean;
  downtimeType?: string;
  downtimeId?: string;
}

interface Booking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
  user_profiles?: {
    email: string;
  };
}

interface Downtime {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  room_id: string;
  downtime_type: string;
}

interface TimelineRoom {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  photo_url?: string;
  location?: string;
  amenities: string[];
  timeSlots: TimeSlot[];
}

interface RoomTimelineProps {
  rooms: TimelineRoom[];
  selectedDate: Date;
  onQuickBook: (roomId: string, timeSlot: string) => void;
  onTimeSlotSelect: (roomId: string, timeSlot: string) => void;
  onBookingUpdate?: () => void;
  onDateSelect: (date: Date) => void;
  onEditBooking?: (booking: any) => void;
  expandedRooms: Set<string>;
  onExpandedRoomsChange: (expandedRooms: Set<string>) => void;
  refreshTrigger?: number;
}

const RoomTimelineComponent = memo(function RoomTimeline({ 
  rooms, 
  selectedDate, 
  onQuickBook, 
  onTimeSlotSelect, 
  onBookingUpdate, 
  onDateSelect, 
  onEditBooking, 
  expandedRooms, 
  onExpandedRoomsChange, 
  refreshTrigger 
}: RoomTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const { organization } = useOrganization();

  // Use React Query for data fetching
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);
  const { data: downtime = [], refetch: refetchDowntime } = useDowntime(selectedDate);

  // Debug logging - critical for tracking data flow
  console.log('🔍 RoomTimeline Debug:', {
    selectedDate: selectedDate.toISOString(),
    bookingsCount: bookings.length,
    roomsCount: rooms.length,
    bookingTitles: bookings.map(b => b.title),
    organizationTimezone: organization?.timezone
  });

  // Expand all rooms by default
  useEffect(() => {
    if (rooms.length > 0 && expandedRooms.size === 0) {
      const allRoomIds = new Set(rooms.map(room => room.id));
      onExpandedRoomsChange(allRoomIds);
    }
  }, [rooms, expandedRooms.size, onExpandedRoomsChange]);

  // Generate time slots for full day (24 hours)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const endTimeStr = `${((hour + 1) % 24).toString().padStart(2, '0')}:00`;
      slots.push({ time: timeStr, endTime: endTimeStr });
    }
    return slots;
  };

  // Generate week days
  const generateWeekDays = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const weekDays = useMemo(() => generateWeekDays(), [selectedDate]);

  // Simple and reliable booking check - check if any part of booking overlaps with time slot
  const isBookingInSlot = (booking: Booking, slotDate: string, slotTime: string): boolean => {
    try {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // Create slot start and end times
      const [slotHour] = slotTime.split(':').map(Number);
      const slotStart = new Date(`${slotDate}T${slotTime}:00.000Z`);
      const slotEnd = new Date(`${slotDate}T${slotHour + 1 < 24 ? (slotHour + 1).toString().padStart(2, '0') : '00'}:00.000Z`);
      
      // Check if booking overlaps with slot
      const overlaps = bookingStart < slotEnd && bookingEnd > slotStart;
      
      return overlaps;
    } catch (error) {
      console.error('Error checking booking overlap:', error);
      return false;
    }
  };

  // Generate rooms with real booking data
  const roomsWithBookings = useMemo(() => {
    console.log('🏠 Processing rooms with bookings:', {
      roomsCount: rooms.length,
      bookingsTotal: bookings.length,
      weekDaysCount: weekDays.length,
      timeSlotsCount: timeSlots.length,
      selectedDateStr: format(selectedDate, 'yyyy-MM-dd')
    });
    
    if (bookings.length === 0) {
      console.warn('⚠️ NO BOOKINGS FOUND - Check if data is being fetched correctly');
    }
    
    return rooms.map(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id);
      const roomDowntime = downtime.filter(d => d.room_id === room.id);
      
      console.log(`🏠 Room "${room.name}" (${room.id}):`, {
        bookingsCount: roomBookings.length,
        bookings: roomBookings.map(b => ({
          title: b.title,
          start: b.start_time,
          end: b.end_time,
          id: b.id
        }))
      });
      
      const timeSlots: TimeSlot[] = [];
      
      weekDays.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        generateTimeSlots().forEach(({ time, endTime }) => {
          // Find any booking that overlaps with this time slot
          const booking = roomBookings.find(b => isBookingInSlot(b, dateStr, time));
          const roomDt = roomDowntime.find(d => isBookingInSlot(d as any, dateStr, time));
          
          // Debug specific cases
          if (booking) {
            console.log(`✅ BOOKING FOUND: "${booking.title}" for ${room.name} at ${dateStr} ${time}`, {
              bookingStart: booking.start_time,
              bookingEnd: booking.end_time,
              slotTime: `${dateStr}T${time}:00`
            });
          }
          
          // Debug for missing bookings on specific dates
          if (room.name.includes('6th Floor') && dateStr === '2025-07-25' && time === '10:00') {
            console.log(`🔍 Checking slot 10:00 for 6th Floor Meeting Room on 2025-07-25:`, {
              roomBookings: roomBookings.map(b => ({
                title: b.title,
                start: b.start_time,
                end: b.end_time
              })),
              foundBooking: !!booking
            });
          }
          
          timeSlots.push({
            time,
            endTime,
            available: !booking && !roomDt,
            meeting: booking?.title || (roomDt && `${roomDt.title} (${roomDt.downtime_type})`),
            bookingId: booking?.id,
            isDowntime: !!roomDt,
            downtimeType: roomDt?.downtime_type,
            downtimeId: roomDt?.id,
            date: dateStr
          });
        });
      });
      
      return {
        ...room,
        timeSlots
      };
    });
  }, [rooms, bookings, downtime, weekDays]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refetchBookings();
      refetchDowntime();
    }
  }, [refreshTrigger, refetchBookings, refetchDowntime]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 7)
      : addDays(selectedDate, 7);
    onDateSelect(newDate);
  };

  const toggleRoomExpansion = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    onExpandedRoomsChange(newExpanded);
  };

  const handleBookingClick = (booking: any) => {
    if (onEditBooking) {
      const fullBooking = bookings.find(b => b.id === booking.bookingId);
      if (fullBooking) {
        onEditBooking(fullBooking);
      }
    }
  };

  const isCurrentTime = (date: Date, time: string) => {
    if (!isSameDay(date, currentTime)) return false;
    const currentHour = currentTime.getHours();
    const slotHour = parseInt(time.split(':')[0]);
    return currentHour === slotHour;
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && handleDateSelect(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Badge variant="secondary">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} this week
        </Badge>
      </div>

      {/* Timeline Grid */}
      <div className="space-y-4">
        {roomsWithBookings.map((room) => (
          <Card key={room.id} className="timeline-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRoomExpansion(room.id)}
                  >
                    {expandedRooms.has(room.id) ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Expand className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {room.capacity} people
                      </span>
                      {room.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {room.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickBook(room.id, '')}
                >
                  Book Room
                </Button>
              </div>
            </CardHeader>

            {expandedRooms.has(room.id) && (
              <CardContent className="pt-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      <div className="p-2 text-sm font-medium">Time</div>
                      {weekDays.map((day) => (
                        <div
                          key={format(day, 'yyyy-MM-dd')}
                          className={cn(
                            "p-2 text-center text-sm font-medium",
                            isSameDay(day, currentTime) && "bg-primary/10 rounded"
                          )}
                        >
                          <div>{format(day, 'EEE')}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(day, 'MMM d')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Time Slots */}
                    <div className="space-y-1">
                      {timeSlots.map(({ time }) => {
                        const daySlots = weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          return room.timeSlots.find(
                            slot => slot.time === time && slot.date === dateStr
                          );
                        });

                        return (
                          <div key={time} className="grid grid-cols-8 gap-1">
                            <div className="p-2 text-xs font-mono text-muted-foreground bg-muted/30 rounded">
                              {time}
                            </div>
                            {daySlots.map((slot, dayIndex) => {
                              const day = weekDays[dayIndex];
                              const isCurrent = isCurrentTime(day, time);
                              
                              return (
                                <div
                                  key={`${format(day, 'yyyy-MM-dd')}-${time}`}
                                  className={cn(
                                    "min-h-[40px] border rounded p-1 text-xs cursor-pointer transition-all hover:shadow-md",
                                    slot?.available 
                                      ? "bg-success/10 border-success/20 hover:bg-success/20" 
                                      : slot?.isDowntime
                                      ? "bg-warning/20 border-warning/30"
                                      : "bg-destructive/10 border-destructive/20",
                                    isCurrent && "ring-2 ring-primary/50",
                                    !slot?.available && "hover:bg-destructive/20"
                                  )}
                                  onClick={() => {
                                    if (slot?.available) {
                                      const slotDateTime = `${format(day, 'yyyy-MM-dd')}T${time}:00`;
                                      onTimeSlotSelect(room.id, slotDateTime);
                                    } else if (slot?.bookingId) {
                                      handleBookingClick(slot);
                                    }
                                  }}
                                >
                                  {slot?.meeting && (
                                    <div className="font-medium text-foreground truncate">
                                      {slot.meeting}
                                    </div>
                                  )}
                                  {slot?.available && (
                                    <div className="text-success font-medium">Available</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <BookingDetailsModal
        booking={selectedBooking}
        room={selectedBooking ? rooms.find(r => r.id === selectedBooking.room_id) : null}
        isOpen={isBookingDetailsOpen}
        onClose={() => setIsBookingDetailsOpen(false)}
        onEdit={() => {
          setIsBookingDetailsOpen(false);
          if (selectedBooking && onEditBooking) {
            onEditBooking(selectedBooking);
          }
        }}
      />
    </div>
  );
});

export const RoomTimeline = RoomTimelineComponent;