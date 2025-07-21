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

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  meeting?: string;
  bookedBy?: string;
  date?: string; // For week view
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

const RoomTimelineComponent = memo(function RoomTimeline({ rooms, selectedDate, onQuickBook, onTimeSlotSelect, onBookingUpdate, onDateSelect, onEditBooking, expandedRooms, onExpandedRoomsChange, refreshTrigger }: RoomTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);

  // Use React Query for data fetching
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);
  const { data: downtime = [], refetch: refetchDowntime } = useDowntime(selectedDate);

  // Responsive hour range based on screen size
  const getResponsiveHourRange = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1920) {
      return { start: 6, end: 22 }; // 16 hours for large screens
    } else if (screenWidth >= 1440) {
      return { start: 7, end: 21 }; // 14 hours for desktop
    } else if (screenWidth >= 1024) {
      return { start: 8, end: 20 }; // 12 hours for laptop
    } else if (screenWidth >= 768) {
      return { start: 8, end: 18 }; // 10 hours for tablet
    } else {
      return { start: 9, end: 17 }; // 8 hours for mobile
    }
  };

  const [selectedHourRange, setSelectedHourRange] = useState(getResponsiveHourRange());

  // Generate week days
  const generateWeekDays = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  // Generate hourly time slots
  const generateTimeSlots = () => {
    console.log("Generating time slots with hour range:", selectedHourRange);
    const slots = [];
    for (let hour = selectedHourRange.start; hour < selectedHourRange.end; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
      slots.push({ time: timeStr, endTime: endTimeStr });
    }
    console.log("Generated time slots:", slots.map(s => s.time));
    return slots;
  };

  // Memoized calculations for better performance
  const timeSlots = useMemo(() => generateTimeSlots(), [selectedHourRange]);
  const weekDays = useMemo(() => generateWeekDays(), [selectedDate]);

  // Memoized booking lookup maps for performance
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      if (!map.has(booking.room_id)) {
        map.set(booking.room_id, []);
      }
      map.get(booking.room_id)!.push(booking);
    });
    return map;
  }, [bookings]);

  const downtimeByRoom = useMemo(() => {
    const map = new Map<string, Downtime[]>();
    downtime.forEach(dt => {
      if (!map.has(dt.room_id)) {
        map.set(dt.room_id, []);
      }
      map.get(dt.room_id)!.push(dt);
    });
    return map;
  }, [downtime]);

  // Optimized booking matching function
  const findBookingForSlot = useCallback((roomId: string, slotDateTime: string) => {
    const roomBookings = bookingsByRoom.get(roomId) || [];
    const slotStart = new Date(slotDateTime);
    
    return roomBookings.find(b => {
      // Parse UTC times correctly - don't strip timezone info
      const bookingStart = new Date(b.start_time);
      const bookingEnd = new Date(b.end_time);
      
      // Check if slot time falls within booking time range
      return bookingStart <= slotStart && bookingEnd > slotStart;
    });
  }, [bookingsByRoom]);

  const findDowntimeForSlot = useCallback((roomId: string, slotDateTime: string) => {
    const roomDowntimes = downtimeByRoom.get(roomId) || [];
    const slotStart = new Date(slotDateTime);
    
    return roomDowntimes.find(d => {
      // Parse UTC times correctly - don't strip timezone info
      const downtimeStart = new Date(d.start_time);
      const downtimeEnd = new Date(d.end_time);
      return downtimeStart <= slotStart && downtimeEnd > slotStart;
    });
  }, [downtimeByRoom]);

  // Generate rooms with real booking and downtime data - memoized for performance
  const roomsWithBookings = useMemo(() => {
    console.log("Generating rooms with bookings. Current bookings:", bookings.length);
    console.log("Current downtime:", downtime);
    
    return rooms.map(room => {
      console.log(`Processing room: ${room.name} (${room.id})`);
      
      const timeSlots: TimeSlot[] = [];
      
      weekDays.forEach(date => {
        timeSlots.forEach(({ time, endTime }) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const startDateTime = `${dateStr}T${time}:00.000Z`; // Add .000Z to match UTC format
          
          const booking = findBookingForSlot(room.id, startDateTime);
          const roomDowntime = findDowntimeForSlot(room.id, startDateTime);
          
          
          timeSlots.push({
            time,
            endTime,
            available: !booking && !roomDowntime,
            meeting: booking?.title || (roomDowntime && `${roomDowntime.title} (${roomDowntime.downtime_type})`),
            bookingId: booking?.id,
            isDowntime: !!roomDowntime,
            downtimeType: roomDowntime?.downtime_type,
            downtimeId: roomDowntime?.id,
            date: dateStr
          });
        });
      });
      
      return {
        ...room,
        timeSlots
      };
    });
  }, [rooms, bookings, downtime, weekDays, timeSlots, findBookingForSlot, findDowntimeForSlot]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Update hour range on screen resize
  useEffect(() => {
    const handleResize = () => {
      setSelectedHourRange(getResponsiveHourRange());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refetch data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refetchBookings();
      refetchDowntime();
    }
  }, [refreshTrigger, refetchBookings, refetchDowntime]);

  // Remove the useEffect since we're using useMemo now

  const getCurrentHour = () => {
    return new Date().getHours();
  };

  const isCurrentHour = (timeSlot: string, date?: Date) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    const today = new Date();
    const checkDate = date || selectedDate;
    return hour === getCurrentHour() && isSameDay(checkDate, today);
  };

  const isPastTimeSlot = (timeSlot: string, date?: Date) => {
    const checkDate = date || selectedDate;
    const today = new Date();
    
    // If the entire date is in the past, all slots are past
    if (checkDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return true;
    }
    
    // For today only, check if the specific time slot is past
    if (isSameDay(checkDate, today)) {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      
      return slotTime < today;
    }
    
    // Future dates are never past
    return false;
  };

  const shiftTimeRange = (direction: 'earlier' | 'later') => {
    if (direction === 'earlier' && selectedHourRange.start > 6) {
      setSelectedHourRange(prev => ({
        start: Math.max(6, prev.start - 2),
        end: Math.max(8, prev.end - 2)
      }));
    } else if (direction === 'later' && selectedHourRange.end < 22) {
      setSelectedHourRange(prev => ({
        start: Math.min(20, prev.start + 2),
        end: Math.min(22, prev.end + 2)
      }));
    }
  };

  const toggleRoomExpansion = (roomId: string) => {
    const newSet = new Set(expandedRooms);
    if (newSet.has(roomId)) {
      newSet.delete(roomId);
    } else {
      newSet.add(roomId);
    }
    onExpandedRoomsChange(newSet);
  };

  const goToPreviousDay = () => {
    onDateSelect(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    onDateSelect(addDaysUtil(selectedDate, 1));
  };

  const goToToday = () => {
    onDateSelect(new Date());
  };

  const handleBookingClick = (booking: Booking, room: any) => {
    setSelectedBooking({ ...booking, room });
    setIsBookingDetailsOpen(true);
  };

  const handleBookingEdit = (booking: any) => {
    onEditBooking?.(booking);
    setIsBookingDetailsOpen(false);
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="space-y-3">
      {/* Room Cards */}
      <div className="space-y-3">
        {roomsWithBookings.map((room) => {
          const isExpanded = expandedRooms.has(room.id);
          const todayKey = format(selectedDate, 'yyyy-MM-dd');
          
          return (
            <Card key={room.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 px-4 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{room.capacity} people</span>
                      </div>
                      {room.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{room.location}</span>
                        </div>
                      )}
                    </div>
                    {/* Show week range when expanded */}
                    {isExpanded && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Full Week - {format(weekDays[0], 'MMM d')} to {format(weekDays[6], 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 border rounded px-2 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPreviousDay}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-xs justify-start font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {format(selectedDate, "MMM d")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && onDateSelect(date)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToNextDay}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Today Button */}
                    {!isToday && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="h-6 px-2 text-xs"
                      >
                        Today
                      </Button>
                    )}

                    {/* Time Range Picker for this room */}
                    <div className="flex items-center gap-1 border rounded px-2 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shiftTimeRange('earlier')}
                        disabled={selectedHourRange.start <= 6}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium">
                        {selectedHourRange.start}:00 - {selectedHourRange.end}:00
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shiftTimeRange('later')}
                        disabled={selectedHourRange.end >= 22}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {room.amenities.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {room.amenities.length}
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRoomExpansion(room.id)}
                      className="h-7 w-7 p-0"
                    >
                      {isExpanded ? (
                        <Minimize className="h-3 w-3" />
                      ) : (
                        <Expand className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                {/* Single time header for the room */}
                <div className="flex gap-1 mb-2 text-xs text-muted-foreground border-b pb-1">
                  <div className="flex-shrink-0 w-16 text-center font-medium">Day</div>
                  {timeSlots.map(({ time }) => (
                    <div key={`header-${time}`} className="flex-shrink-0 w-16 text-center font-medium">
                      {time}
                    </div>
                  ))}
                </div>

                {!isExpanded ? (
                  // Collapsed: Show today's time slots
                  <div className="flex gap-1">
                    <div className="flex-shrink-0 w-16 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {format(selectedDate, 'd')}
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="flex gap-1 min-w-max pb-1">
                        {timeSlots.map(({ time }) => {
                          const roomTimeSlot = room.timeSlots.find(ts => 
                            ts.time === time && ts.date === format(selectedDate, 'yyyy-MM-dd')
                          );
                          const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                          const isCurrent = isCurrentHour(time);
                          const isPast = isPastTimeSlot(time);
                          const isDowntime = roomTimeSlot?.isDowntime;
                          
                          return (
                            <div
                              key={`${room.id}-${time}`}
                              className={`
                                flex-shrink-0 w-16 h-10 border rounded cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-200
                                ${isPast 
                                  ? 'bg-muted/50 cursor-not-allowed border-muted/30' 
                                  : isAvailable 
                                    ? 'hover:bg-success/15 text-success-foreground bg-success/5 hover:scale-[1.02] border-success/20' 
                                    : isDowntime
                                      ? 'bg-warning/10 text-warning-foreground hover:bg-warning/15 cursor-not-allowed border-warning/20'
                                      : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed border-destructive/20'
                                }
                                ${isCurrent ? 'ring-1 ring-primary/40 bg-primary/10' : ''}
                              `}
                              onClick={() => {
                                if (!isPast && isAvailable) {
                                  onTimeSlotSelect(room.id, `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`);
                                } else if (!isAvailable && !isDowntime && roomTimeSlot) {
                                  // Find the full booking data
                                  const fullBooking = bookings.find(b => b.id === roomTimeSlot.bookingId);
                                  if (fullBooking) {
                                    handleBookingClick(fullBooking, room);
                                  }
                                }
                              }}
                              title={
                                isPast 
                                  ? isAvailable 
                                    ? 'Past time slot' 
                                    : `Past booking: ${roomTimeSlot?.meeting || 'Meeting'}`
                                  : isAvailable 
                                    ? 'Available for booking' 
                                    : isDowntime 
                                      ? `${roomTimeSlot?.downtimeType || 'Downtime'}: ${roomTimeSlot?.meeting || 'Maintenance'}` 
                                      : `Booked: ${roomTimeSlot?.meeting || 'Meeting'}`
                              }
                            >
                              {isPast ? (
                                isAvailable ? (
                                  <span className="text-muted-foreground/50 font-semibold">Past</span>
                                ) : (
                                  <span className="text-destructive/40 font-semibold text-[10px] truncate px-1">
                                    {roomTimeSlot?.meeting?.substring(0, 6) || 'Booked'}
                                  </span>
                                )
                              ) : isAvailable ? (
                                <span className="text-success font-semibold">Free</span>
                              ) : isDowntime ? (
                                <span className="text-warning font-semibold text-[10px]">
                                  {roomTimeSlot?.downtimeType?.substring(0, 4) || 'Down'}
                                </span>
                              ) : (
                                <span className="text-destructive font-semibold text-[10px] truncate px-1">
                                  {roomTimeSlot?.meeting?.substring(0, 6) || 'Booked'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // Expanded: Show full week
                  <div>
                    {weekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = isSameDay(day, selectedDate);
                      
                      return (
                        <div key={`${room.id}-${dayKey}`} className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-16 flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isToday 
                                ? 'bg-primary text-primary-foreground' 
                                : isWeekend 
                                  ? 'bg-red-100 text-red-600' 
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="flex gap-1 min-w-max pb-1">
                              {timeSlots.map(({ time }) => {
                                const roomTimeSlot = room.timeSlots.find(ts => 
                                  ts.time === time && ts.date === dayKey
                                );
                                const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                                const isCurrent = isCurrentHour(time, day);
                                const isPast = isPastTimeSlot(time, day);
                                const isDowntime = roomTimeSlot?.isDowntime;
                                
                                return (
                                  <div
                                    key={`${room.id}-${dayKey}-${time}`}
                                    className={`
                                      flex-shrink-0 w-16 h-10 border rounded cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-200
                                      ${isPast 
                                        ? 'bg-muted/50 cursor-not-allowed border-muted/30' 
                                        : isAvailable 
                                          ? 'hover:bg-success/15 text-success-foreground bg-success/5 hover:scale-[1.02] border-success/20' 
                                          : isDowntime
                                            ? 'bg-warning/10 text-warning-foreground hover:bg-warning/15 cursor-not-allowed border-warning/20'
                                            : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed border-destructive/20'
                                      }
                                      ${isCurrent ? 'ring-1 ring-primary/40 bg-primary/10' : ''}
                                    `}
                                    onClick={() => {
                                      if (!isPast && isAvailable) {
                                        onTimeSlotSelect(room.id, `${dayKey}T${time}:00`);
                                      } else if (!isAvailable && !isDowntime && roomTimeSlot) {
                                        // Find the full booking data
                                        const fullBooking = bookings.find(b => b.id === roomTimeSlot.bookingId);
                                        if (fullBooking) {
                                          handleBookingClick(fullBooking, room);
                                        }
                                      }
                                    }}
                                    title={
                                      isPast 
                                        ? isAvailable 
                                          ? 'Past time slot' 
                                          : `Past booking: ${roomTimeSlot?.meeting || 'Meeting'}`
                                        : isAvailable 
                                          ? 'Available for booking' 
                                          : isDowntime 
                                            ? `${roomTimeSlot?.downtimeType || 'Downtime'}: ${roomTimeSlot?.meeting || 'Maintenance'}` 
                                            : `Booked: ${roomTimeSlot?.meeting || 'Meeting'}`
                                    }
                                  >
                                    {isPast ? (
                                      isAvailable ? (
                                        <span className="text-muted-foreground/50 font-semibold text-[10px]">Past</span>
                                      ) : (
                                        <span className="text-destructive/40 font-semibold text-[10px] truncate px-1">
                                          {roomTimeSlot?.meeting?.substring(0, 6) || 'Booked'}
                                        </span>
                                      )
                                    ) : isAvailable ? (
                                      <span className="text-success font-semibold">Free</span>
                                    ) : isDowntime ? (
                                      <span className="text-warning font-semibold text-[10px]">
                                        {roomTimeSlot?.downtimeType?.substring(0, 4) || 'Down'}
                                      </span>
                                    ) : (
                                      <span className="text-destructive font-semibold text-[10px] truncate px-1">
                                        {roomTimeSlot?.meeting?.substring(0, 6) || 'Booked'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                     })}
                   </div>
                 )}
               </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={isBookingDetailsOpen}
        onClose={() => {
          setIsBookingDetailsOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        room={selectedBooking?.room}
        onEdit={handleBookingEdit}
        onBookingUpdate={onBookingUpdate}
      />
    </div>
  );
});

export const RoomTimeline = RoomTimelineComponent;