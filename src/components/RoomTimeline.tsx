import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Calendar, ArrowLeft, ArrowRight, Expand, Minimize } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, subDays } from "date-fns";
import { BookingDetailsModal } from "@/components/BookingDetailsModal";
import { useBookings, useDowntime } from "@/hooks/useBookings";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/hooks/useAuth";

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  meeting?: string;
  bookedBy?: string;
  bookerAvatar?: string;
  bookerDisplayName?: string;
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
    display_name?: string;
    avatar_url?: string;
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
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [roomDates, setRoomDates] = useState<Record<string, Date>>({});
  const { organization, userRole } = useOrganization();

  // Fetch booking data
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);
  const { data: downtime = [], refetch: refetchDowntime } = useDowntime(selectedDate);

  console.log('📅 CALENDAR DEBUG - Raw Data:', {
    selectedDate: selectedDate.toISOString(),
    totalBookings: bookings.length,
    bookingsList: bookings.map(b => ({
      id: b.id,
      title: b.title,
      start: b.start_time,
      end: b.end_time,
      room: b.room_id
    })),
    totalRooms: rooms.length
  });

  // Initialize room dates and expand all rooms by default on first load
  useEffect(() => {
    if (rooms.length > 0) {
      // Initialize room dates with selected date
      const initialRoomDates: Record<string, Date> = {};
      rooms.forEach(room => {
        if (!roomDates[room.id]) {
          initialRoomDates[room.id] = selectedDate;
        }
      });
      if (Object.keys(initialRoomDates).length > 0) {
        setRoomDates(prev => ({ ...prev, ...initialRoomDates }));
      }
      
      // Auto-expand rooms
      if (expandedRooms.size === 0) {
        const allRoomIds = new Set(rooms.map(room => room.id));
        onExpandedRoomsChange(allRoomIds);
        console.log('📅 Auto-expanding all rooms:', allRoomIds);
      }
    }
  }, [rooms, expandedRooms.size, onExpandedRoomsChange, selectedDate]);

  // Generate business hours time slots (8 AM to 8 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${((hour + 1)).toString().padStart(2, '0')}:00`
      });
    }
    console.log('📅 Generated business hours time slots:', slots.length, 'hours (8 AM - 8 PM)');
    return slots;
  }, []);

  // Generate week days for each room
  const getRoomWeekDays = useCallback((roomId: string) => {
    const roomDate = roomDates[roomId] || selectedDate;
    const weekStart = startOfWeek(roomDate, { weekStartsOn: 1 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [roomDates, selectedDate]);

  // CRITICAL: Simple and bulletproof booking overlap check
  const doesBookingOverlapSlot = useCallback((booking: Booking, slotDate: string, slotHour: number): boolean => {
    try {
      // Parse booking times as UTC (they're stored in UTC)
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // Create slot boundaries in UTC
      const slotStart = new Date(`${slotDate}T${slotHour.toString().padStart(2, '0')}:00:00.000Z`);
      const slotEnd = new Date(`${slotDate}T${((slotHour + 1) % 24).toString().padStart(2, '0')}:00:00.000Z`);
      
      // Simple overlap check: booking overlaps if it starts before slot ends and ends after slot starts
      const overlaps = bookingStart < slotEnd && bookingEnd > slotStart;
      
      if (overlaps) {
        console.log('✅ BOOKING OVERLAP FOUND:', {
          booking: booking.title,
          bookingWindow: `${bookingStart.toISOString()} - ${bookingEnd.toISOString()}`,
          slotWindow: `${slotStart.toISOString()} - ${slotEnd.toISOString()}`,
          slotDate,
          slotHour
        });
      }
      
      return overlaps;
    } catch (error) {
      console.error('❌ Error checking booking overlap:', error, { booking: booking.title, slotDate, slotHour });
      return false;
    }
  }, []);

  // Process rooms with booking data - SIMPLIFIED LOGIC
  const roomsWithBookings = useMemo(() => {
    console.log('🏠 PROCESSING ROOMS WITH BOOKINGS');
    console.log('Input data:', { roomsCount: rooms.length, bookingsCount: bookings.length });
    
    return rooms.map(room => {
      // Get bookings for this specific room
      const roomBookings = bookings.filter(b => b.room_id === room.id);
      const roomDowntime = downtime.filter(d => d.room_id === room.id);
      const roomWeekDays = getRoomWeekDays(room.id);
      
      console.log(`🏠 Room: "${room.name}" (${room.id})`);
      console.log(`   📋 Bookings for this room: ${roomBookings.length}`);
      roomBookings.forEach(b => {
        console.log(`   - "${b.title}" (${b.start_time} to ${b.end_time})`);
      });

      const timeSlots: TimeSlot[] = [];
      
      // For each day of the week for this room
      roomWeekDays.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // For each business hour (8 AM to 8 PM)
        for (let hour = 8; hour <= 20; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          // Find booking that overlaps this time slot
          const booking = roomBookings.find(b => doesBookingOverlapSlot(b, dateStr, hour));
          const downtime = roomDowntime.find(d => doesBookingOverlapSlot(d as any, dateStr, hour));
          
          timeSlots.push({
            time: timeStr,
            endTime: endTimeStr,
            available: !booking && !downtime,
            meeting: booking?.title || (downtime && `${downtime.title} (${downtime.downtime_type})`),
            bookedBy: booking?.user_profiles?.email,
            bookerAvatar: booking?.user_profiles?.avatar_url,
            bookerDisplayName: booking?.user_profiles?.display_name,
            bookingId: booking?.id,
            isDowntime: !!downtime,
            downtimeType: downtime?.downtime_type,
            downtimeId: downtime?.id,
            date: dateStr
          });
        }
      });
      
      const occupiedSlots = timeSlots.filter(slot => !slot.available).length;
      console.log(`   📊 Time slots: ${timeSlots.length} total, ${occupiedSlots} occupied`);
      
      return {
        ...room,
        timeSlots,
        weekDays: roomWeekDays
      };
    });
  }, [rooms, bookings, downtime, getRoomWeekDays, doesBookingOverlapSlot]);

  // Refresh data when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      console.log('🔄 Refreshing booking data due to trigger change');
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
    console.log('📅 Date selected:', format(date, 'yyyy-MM-dd'));
    onDateSelect(date);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 7)
      : addDays(selectedDate, 7);
    console.log('📅 Navigating week:', direction, 'to', format(newDate, 'yyyy-MM-dd'));
    onDateSelect(newDate);
  };

  const navigateRoomWeek = (roomId: string, direction: 'prev' | 'next') => {
    const currentRoomDate = roomDates[roomId] || selectedDate;
    const newDate = direction === 'prev' 
      ? subDays(currentRoomDate, 7)
      : addDays(currentRoomDate, 7);
    console.log('📅 Navigating room week:', roomId, direction, 'to', format(newDate, 'yyyy-MM-dd'));
    setRoomDates(prev => ({ ...prev, [roomId]: newDate }));
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
    if (booking.bookingId) {
      const fullBooking = bookings.find(b => b.id === booking.bookingId);
      if (fullBooking) {
        console.log('📅 Clicked on booking:', fullBooking.title);
        
        // Check if user can edit this booking
        const canEditBooking = userRole === 'admin' || fullBooking.user_id === user?.id;
        
        if (canEditBooking && onEditBooking) {
          console.log('📅 Editing booking:', fullBooking.title);
          onEditBooking(fullBooking);
        } else {
          // Show details modal for view-only
          console.log('📅 View-only access to booking:', fullBooking.title);
          // You could show a different modal or toast message here
        }
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

      {/* Timeline Grid */}
      <div className="space-y-4">
        {roomsWithBookings.length === 0 ? (
          <Card className="timeline-card p-8 text-center">
            <p className="text-muted-foreground">No rooms available</p>
          </Card>
        ) : (
          roomsWithBookings.map((room) => (
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
                  
                  <div className="flex items-center gap-2">
                    {/* Room Week Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateRoomWeek(room.id, 'prev')}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="text-sm text-muted-foreground min-w-[120px] text-center">
                        Week of {format(startOfWeek(roomDates[room.id] || selectedDate, { weekStartsOn: 1 }), 'MMM d')}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateRoomWeek(room.id, 'next')}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {expandedRooms.has(room.id) && (
                <CardContent className="pt-0">
                  <ScrollArea className="w-full">
                    <div className="min-w-[800px]">
                      {/* Day Headers */}
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        <div className="p-2 text-sm font-medium">Time</div>
                        {room.weekDays.map((day) => (
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

                      {/* Time Slots Grid */}
                      <div className="space-y-1">
                        {timeSlots.map(({ time }) => {
                          // Get the slots for this time across all days of the week for this room
                          const daySlots = room.weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            return room.timeSlots.find(
                              slot => slot.time === time && slot.date === dateStr
                            );
                          });

                          return (
                            <div key={time} className="grid grid-cols-8 gap-1">
                              {/* Time label */}
                              <div className="p-2 text-xs font-mono text-muted-foreground bg-muted/30 rounded">
                                {time}
                              </div>
                              
                              {/* Slots for each day */}
                              {daySlots.map((slot, dayIndex) => {
                                const day = room.weekDays[dayIndex];
                                const isCurrent = isCurrentTime(day, time);
                                
                                return (
                                  <div
                                    key={`${format(day, 'yyyy-MM-dd')}-${time}`}
                                    className={cn(
                                      "min-h-[50px] border rounded p-2 text-xs cursor-pointer transition-all hover:shadow-md relative",
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
                                    title={slot?.meeting || (slot?.available ? 'Available' : 'Unavailable')}
                                  >
                                    {slot?.meeting && (
                                      <div className="flex flex-col gap-1">
                                        <div className="font-medium text-foreground text-xs leading-tight">
                                          {slot.meeting}
                                        </div>
                                        {(slot.bookerAvatar || slot.bookerDisplayName || slot.bookedBy) && (
                                          <div className="flex items-center gap-1.5 mt-1">
                                            {slot.bookerAvatar ? (
                                              <img 
                                                src={slot.bookerAvatar} 
                                                alt="Booker avatar" 
                                                className="w-4 h-4 rounded-full object-cover border border-white/20"
                                              />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full bg-primary/40 flex items-center justify-center border border-white/20">
                                                <span className="text-[9px] font-medium text-primary">
                                                  {(slot.bookerDisplayName || slot.bookedBy)?.charAt(0).toUpperCase()}
                                                </span>
                                              </div>
                                            )}
                                            <span className="text-[9px] text-muted-foreground truncate leading-tight max-w-[60px]">
                                              {slot.bookerDisplayName || slot.bookedBy}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {slot?.available && (
                                      <div className="text-success font-medium text-xs">Available</div>
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
          ))
        )}
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