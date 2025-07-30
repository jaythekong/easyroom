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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedBookingRoom, setSelectedBookingRoom] = useState<any>(null);
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
      // Initialize room dates with selected date - sync all rooms to the same date
      const initialRoomDates: Record<string, Date> = {};
      rooms.forEach(room => {
        initialRoomDates[room.id] = selectedDate;
      });
      setRoomDates(initialRoomDates);
      
      // Auto-expand rooms
      if (expandedRooms.size === 0) {
        const allRoomIds = new Set(rooms.map(room => room.id));
        onExpandedRoomsChange(allRoomIds);
        console.log('📅 Auto-expanding all rooms:', allRoomIds);
      }
    }
  }, [rooms, expandedRooms.size, onExpandedRoomsChange, selectedDate]);

  // Sync room dates whenever selectedDate changes
  useEffect(() => {
    if (rooms.length > 0) {
      setRoomDates(prev => {
        const updated: Record<string, Date> = {};
        rooms.forEach(room => {
          updated[room.id] = selectedDate;
        });
        return updated;
      });
    }
  }, [selectedDate, rooms]);

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

  // Generate days for each room - mobile shows 3 days centered on selected date, desktop shows full week
  const getRoomWeekDays = useCallback((roomId: string) => {
    if (isMobile) {
      // Mobile: show 3 days centered around selected date (previous, current, next)
      const mobileDays = [
        subDays(selectedDate, 1),
        selectedDate,
        addDays(selectedDate, 1)
      ];
      console.log('📅 Mobile days generated:', mobileDays.map(d => format(d, 'yyyy-MM-dd')));
      return mobileDays;
    } else {
      // Desktop: show full week starting from Monday
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
      console.log('📅 Desktop week days generated:', days.map(d => format(d, 'yyyy-MM-dd')));
      return days;
    }
  }, [selectedDate, isMobile]);

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
    // Sync all room dates with the new selected date
    setRoomDates(prev => {
      const updated: Record<string, Date> = {};
      rooms.forEach(room => {
        updated[room.id] = date;
      });
      return updated;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    // Move by 3 days on mobile (shows 3-day window), 7 days on desktop (showing full week)
    const daysToSkip = isMobile ? 3 : 7;
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, daysToSkip)
      : addDays(selectedDate, daysToSkip);
    console.log('📅 Navigating week:', direction, 'by', daysToSkip, 'days to', format(newDate, 'yyyy-MM-dd'));
    onDateSelect(newDate);
    // Sync all room dates with the new selected date
    setRoomDates(prev => {
      const updated: Record<string, Date> = {};
      rooms.forEach(room => {
        updated[room.id] = newDate;
      });
      return updated;
    });
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

  const handleBookingClick = (booking: any, room: any) => {
    console.log('🔍 BOOKING CLICKED:', { booking, room });
    
    if (booking.bookingId) {
      const fullBooking = bookings.find(b => b.id === booking.bookingId);
      if (fullBooking) {
        console.log('📅 BOOKING CLICK DEBUG:', {
          bookingTitle: fullBooking.title,
          bookingId: fullBooking.id,
          bookingUserId: fullBooking.user_id,
          currentUser: user?.id,
          userRole: userRole,
          isAdmin: userRole === 'admin',
          isOwner: fullBooking.user_id === user?.id,
          onEditBookingExists: !!onEditBooking
        });
        
        // Check if user can edit this booking
        const canEditBooking = userRole === 'admin' || fullBooking.user_id === user?.id;
        
        console.log('📅 PERMISSION CHECK:', {
          canEditBooking,
          userRole,
          bookingOwnerId: fullBooking.user_id,
          currentUserId: user?.id,
          hasOnEditBooking: !!onEditBooking
        });
        
        // If user can edit AND onEditBooking is provided, allow editing
        if (canEditBooking && onEditBooking) {
          console.log('📅 EDITING booking:', fullBooking.title);
          onEditBooking(fullBooking);
        } else {
          // Otherwise, show details modal (for view-only or when onEditBooking is not available)
          console.log('📅 SHOWING DETAILS for booking:', fullBooking.title);
          console.log('📅 Setting selectedBooking:', fullBooking);
          console.log('📅 Setting selectedBookingRoom:', room);
          setSelectedBooking(fullBooking);
          setSelectedBookingRoom(room);
          setIsBookingDetailsOpen(true);
          console.log('📅 Modal should be open now');
        }
      } else {
        console.error('❌ Full booking not found for ID:', booking.bookingId);
      }
    } else {
      console.error('❌ No bookingId in slot:', booking);
    }
  };

  const isCurrentTime = (date: Date, time: string) => {
    if (!isSameDay(date, currentTime)) return false;
    const currentHour = currentTime.getHours();
    const slotHour = parseInt(time.split(':')[0]);
    return currentHour === slotHour;
  };

  const isPastTimeSlot = (date: Date, time: string) => {
    const slotDateTime = new Date(date);
    const slotHour = parseInt(time.split(':')[0]);
    const slotMinute = parseInt(time.split(':')[1] || '0');
    slotDateTime.setHours(slotHour, slotMinute, 0, 0);
    
    return slotDateTime < currentTime;
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
                  
                  <div className={cn(
                    "flex items-center gap-1",
                    isMobile ? "flex-col gap-2" : "flex-row gap-2"
                  )}>
                    {/* Day Selection */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(
                          "gap-2",
                          isMobile ? "w-full" : ""
                        )}>
                          <Calendar className="h-4 w-4" />
                          {isMobile ? format(selectedDate, 'MMM d') : format(selectedDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className={cn(
                          "w-auto p-0", 
                          isMobile && "w-[95vw] max-w-sm"
                        )} 
                        align="end"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && handleDateSelect(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {/* Week Navigation */}
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                        <ArrowLeft className="h-4 w-4" />
                        {!isMobile && <span className="ml-2">Previous Week</span>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                        {!isMobile && <span className="mr-2">Next Week</span>}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {expandedRooms.has(room.id) && (
                <CardContent className="pt-0">
                  <ScrollArea className="w-full">
                    <div className={cn(
                      isMobile ? "min-w-[100%]" : "min-w-[800px]"
                    )}>
                      {/* Day Headers */}
                      <div className={cn(
                        "gap-1 mb-2",
                        isMobile ? "grid grid-cols-4" : "grid grid-cols-8"
                      )}>
                        <div className="p-2 text-sm font-medium">Time</div>
                        {(isMobile ? room.weekDays.slice(0, 3) : room.weekDays).map((day) => (
                          <div
                            key={format(day, 'yyyy-MM-dd')}
                            className={cn(
                              "p-2 text-center font-medium",
                              isMobile ? "text-xs" : "text-sm",
                              isSameDay(day, currentTime) && "bg-primary/10 rounded"
                            )}
                          >
                            <div>{format(day, isMobile ? 'EEE' : 'EEE')}</div>
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
                          const daySlots = (isMobile ? room.weekDays.slice(0, 3) : room.weekDays).map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            return room.timeSlots.find(
                              slot => slot.time === time && slot.date === dateStr
                            );
                          });

                          return (
                            <div key={time} className={cn(
                              "gap-1",
                              isMobile ? "grid grid-cols-4" : "grid grid-cols-8"
                            )}>
                              {/* Time label */}
                              <div className={cn(
                                "p-2 font-mono text-muted-foreground bg-muted/30 rounded",
                                isMobile ? "text-xs" : "text-xs"
                              )}>
                                {time}
                              </div>
                              
                              {/* Slots for each day */}
                              {daySlots.map((slot, dayIndex) => {
                                const day = (isMobile ? room.weekDays.slice(0, 3) : room.weekDays)[dayIndex];
                                const isCurrent = isCurrentTime(day, time);
                                const isPast = isPastTimeSlot(day, time);
                                
                                return (
                                  <div
                                    key={`${format(day, 'yyyy-MM-dd')}-${time}`}
                                    className={cn(
                                      "border rounded p-2 transition-all relative",
                                      isMobile ? "min-h-[60px] text-xs" : "min-h-[50px] text-xs",
                                      // Past time slots - greyed out and not clickable
                                      isPast && slot?.available && "bg-muted/20 border-muted/40 opacity-60 cursor-not-allowed",
                                      // Available slots (not past)
                                      !isPast && slot?.available && "bg-success/10 border-success/20 hover:bg-success/20 cursor-pointer hover:shadow-md",
                                      // Booked slots
                                      !slot?.available && slot?.isDowntime && "bg-warning/20 border-warning/30",
                                      !slot?.available && !slot?.isDowntime && "bg-destructive/10 border-destructive/20",
                                      // Current time highlight
                                      isCurrent && "ring-2 ring-primary/50",
                                      // Hover effects for non-past slots
                                      !isPast && !slot?.available && "cursor-pointer hover:bg-destructive/20 hover:shadow-md"
                                    )}
                                    onClick={() => {
                                      // Prevent booking past time slots
                                      if (isPast && slot?.available) {
                                        return;
                                      }
                                      
                                      if (slot?.available) {
                                        const slotDateTime = `${format(day, 'yyyy-MM-dd')}T${time}:00`;
                                        onTimeSlotSelect(room.id, slotDateTime);
                                      } else if (slot?.bookingId) {
                                        handleBookingClick(slot, room);
                                      }
                                    }}
                                    title={
                                      isPast && slot?.available 
                                        ? 'Past time slot - cannot book' 
                                        : slot?.meeting || (slot?.available ? 'Available' : 'Unavailable')
                                    }
                                  >
                                    {slot?.meeting && (
                                      <div className="flex flex-col gap-1">
                                        <div className={cn(
                                          "font-medium text-foreground leading-tight",
                                          isMobile ? "text-xs" : "text-xs"
                                        )}>
                                          {isMobile ? slot.meeting.substring(0, 10) + (slot.meeting.length > 10 ? '...' : '') : slot.meeting}
                                        </div>
                                        {(slot.bookerAvatar || slot.bookerDisplayName || slot.bookedBy) && (
                                          <div className="flex items-center gap-1.5 mt-1">
                                            {slot.bookerAvatar ? (
                                              <img 
                                                src={slot.bookerAvatar} 
                                                alt="Booker avatar" 
                                                className={cn(
                                                  "rounded-full object-cover border border-white/20",
                                                  isMobile ? "w-5 h-5" : "w-4 h-4"
                                                )}
                                              />
                                            ) : (
                                              <div className={cn(
                                                "rounded-full bg-primary/40 flex items-center justify-center border border-white/20",
                                                isMobile ? "w-5 h-5" : "w-4 h-4"
                                              )}>
                                                <span className={cn(
                                                  "font-medium text-primary",
                                                  isMobile ? "text-xs" : "text-[9px]"
                                                )}>
                                                  {(slot.bookerDisplayName || slot.bookedBy)?.charAt(0).toUpperCase()}
                                                </span>
                                              </div>
                                            )}
                                            {!isMobile && (
                                              <span className="text-[9px] text-muted-foreground truncate leading-tight max-w-[60px]">
                                                {slot.bookerDisplayName || slot.bookedBy}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {slot?.available && (
                                      <div className={cn(
                                        "font-medium",
                                        isMobile ? "text-xs" : "text-xs",
                                        isPast ? "text-muted-foreground" : "text-success"
                                      )}>
                                        {isPast ? "Past" : "Available"}
                                      </div>
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
        room={selectedBookingRoom}
        isOpen={isBookingDetailsOpen}
        onClose={() => {
          setIsBookingDetailsOpen(false);
          setSelectedBooking(null);
          setSelectedBookingRoom(null);
        }}
        onEdit={() => {
          setIsBookingDetailsOpen(false);
          if (selectedBooking && onEditBooking) {
            onEditBooking(selectedBooking);
          }
        }}
        onBookingUpdate={() => {
          onBookingUpdate?.();
          setIsBookingDetailsOpen(false);
          setSelectedBooking(null);
          setSelectedBookingRoom(null);
        }}
      />
    </div>
  );
});

export const RoomTimeline = RoomTimelineComponent;