import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap, Calendar, ChevronLeft, ChevronRight, Expand, Minimize, Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

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
}

export function RoomTimeline({ rooms, selectedDate, onQuickBook, onTimeSlotSelect, onBookingUpdate }: RoomTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedHourRange, setSelectedHourRange] = useState({ start: 8, end: 18 });
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [downtime, setDowntime] = useState<Downtime[]>([]);
  const [roomsWithBookings, setRoomsWithBookings] = useState<TimelineRoom[]>([]);

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
    const slots = [];
    for (let hour = selectedHourRange.start; hour < selectedHourRange.end; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
      slots.push({ time: timeStr, endTime: endTimeStr });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const weekDays = generateWeekDays();

  // Fetch bookings and downtime from database
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lte('start_time', format(addDays(selectedDate, 7), 'yyyy-MM-dd'));
      
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchDowntime = async () => {
    try {
      const { data, error } = await supabase
        .from('room_downtime' as any)
        .select('*')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lte('start_time', format(addDays(selectedDate, 7), 'yyyy-MM-dd'));
      
      if (error) throw error;
      setDowntime((data as any) || []);
    } catch (error) {
      console.error('Error fetching downtime:', error);
    }
  };

  // Generate rooms with real booking and downtime data
  const generateRoomsWithBookings = () => {
    const roomsWithTimeSlots = rooms.map(room => ({
      ...room,
      timeSlots: []
    }));

    // For each room, generate time slots for the full week
    roomsWithTimeSlots.forEach(room => {
      weekDays.forEach(date => {
        timeSlots.forEach(({ time, endTime }) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const startDateTime = `${dateStr}T${time}:00`;
          const endDateTime = `${dateStr}T${endTime}:00`;
          
          // Check if there's a booking for this room and time slot
          const booking = bookings.find(b => 
            b.room_id === room.id &&
            new Date(b.start_time) <= new Date(startDateTime) &&
            new Date(b.end_time) > new Date(startDateTime)
          );

          // Check if there's downtime for this room and time slot
          const roomDowntime = downtime.find(d => 
            d.room_id === room.id &&
            new Date(d.start_time) <= new Date(startDateTime) &&
            new Date(d.end_time) > new Date(startDateTime)
          );
          
          const timeSlot: TimeSlot = {
            time,
            endTime,
            available: !booking && !roomDowntime,
            meeting: booking?.title || (roomDowntime && `${roomDowntime.title} (${roomDowntime.downtime_type})`),
            bookingId: booking?.id,
            isDowntime: !!roomDowntime,
            downtimeType: roomDowntime?.downtime_type,
            downtimeId: roomDowntime?.id,
            date: dateStr
          };
          
          room.timeSlots.push(timeSlot);
        });
      });
    });

    setRoomsWithBookings(roomsWithTimeSlots);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchDowntime();
  }, [selectedDate]);

  useEffect(() => {
    generateRoomsWithBookings();
  }, [rooms, bookings, downtime, selectedDate]);

  const getCurrentHour = () => {
    return new Date().getHours();
  };

  const isCurrentHour = (timeSlot: string, date?: Date) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    const today = new Date();
    const checkDate = date || selectedDate;
    return hour === getCurrentHour() && isSameDay(checkDate, today);
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
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Room Timeline</h2>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftTimeRange('earlier')}
              disabled={selectedHourRange.start <= 6}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {selectedHourRange.start}:00 - {selectedHourRange.end}:00
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftTimeRange('later')}
              disabled={selectedHourRange.end >= 22}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="space-y-4">
        {roomsWithBookings.map((room) => {
          const isExpanded = expandedRooms.has(room.id);
          const todayKey = format(selectedDate, 'yyyy-MM-dd');
          
          return (
            <Card key={room.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{room.capacity} people</span>
                      </div>
                      {room.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{room.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.amenities.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {room.amenities.length} amenities
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRoomExpansion(room.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Expand className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Single time header for the room */}
                <div className="flex gap-2 mb-4 text-xs text-muted-foreground border-b pb-2">
                  <div className="flex-shrink-0 w-16"></div> {/* Space for day labels */}
                  {timeSlots.map(({ time }) => (
                    <div key={`header-${time}`} className="flex-shrink-0 w-20 text-center font-medium">
                      {time}
                    </div>
                  ))}
                </div>

                {!isExpanded ? (
                  // Collapsed: Show today's time slots
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-shrink-0 w-16 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {format(selectedDate, 'd')}
                        </div>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="flex gap-2 min-w-max pb-2">
                          {timeSlots.map(({ time }) => {
                            const roomTimeSlot = room.timeSlots.find(ts => 
                              ts.time === time && ts.date === format(selectedDate, 'yyyy-MM-dd')
                            );
                            const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                            const isCurrent = isCurrentHour(time);
                            const isDowntime = roomTimeSlot?.isDowntime;
                            
                            return (
                              <div
                                key={`${room.id}-${time}`}
                                className={`
                                  flex-shrink-0 w-20 h-16 border rounded-lg cursor-pointer flex flex-col items-center justify-center text-xs font-medium transition-all duration-200
                                  ${isAvailable 
                                    ? 'hover:bg-success/15 text-success-foreground bg-success/5 hover:scale-[1.02] hover:shadow-sm border-success/20' 
                                    : isDowntime
                                      ? 'bg-warning/10 text-warning-foreground hover:bg-warning/15 cursor-not-allowed border-warning/20'
                                      : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed border-destructive/20'
                                  }
                                  ${isCurrent ? 'ring-2 ring-primary/40 bg-primary/10 shadow-inner' : ''}
                                `}
                                onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                              >
                                {isAvailable ? (
                                  isCurrent ? (
                                    <Button
                                      size="sm"
                                      className="h-12 w-16 text-xs font-medium animate-pulse shadow-sm p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickBook(room.id, time);
                                      }}
                                    >
                                      Book Now
                                    </Button>
                                  ) : (
                                    <>
                                      <div className="text-success font-bold">Free</div>
                                      <div className="text-xs text-muted-foreground">Available</div>
                                    </>
                                  )
                                ) : (
                                  <div className="text-center p-1">
                                    {isDowntime ? (
                                      <>
                                        <Wrench className="h-3 w-3 mx-auto mb-1 text-warning" />
                                        <div className="text-warning font-bold text-xs">
                                          {roomTimeSlot?.downtimeType || 'Downtime'}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-destructive font-bold">Booked</div>
                                        {roomTimeSlot?.meeting && (
                                          <div className="text-xs text-muted-foreground truncate max-w-[60px] leading-tight">
                                            {roomTimeSlot.meeting}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  // Expanded: Show full week
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Full Week - {format(weekDays[0], 'MMM d')} to {format(weekDays[6], 'MMM d, yyyy')}
                      </span>
                    </div>
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
                                const isDowntime = roomTimeSlot?.isDowntime;
                                
                                return (
                                  <div
                                    key={`${room.id}-${dayKey}-${time}`}
                                    className={`
                                      flex-shrink-0 w-16 h-10 border rounded cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-200
                                      ${isAvailable 
                                        ? 'hover:bg-success/15 text-success-foreground bg-success/5 hover:scale-[1.02] border-success/20' 
                                        : isDowntime
                                          ? 'bg-warning/10 text-warning-foreground hover:bg-warning/15 cursor-not-allowed border-warning/20'
                                          : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed border-destructive/20'
                                      }
                                      ${isCurrent ? 'ring-1 ring-primary/40 bg-primary/10' : ''}
                                    `}
                                    onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                                    title={
                                      isAvailable 
                                        ? 'Available for booking' 
                                        : isDowntime 
                                          ? `${roomTimeSlot?.downtimeType || 'Downtime'}: ${roomTimeSlot?.meeting || 'Maintenance'}` 
                                          : `Booked: ${roomTimeSlot?.meeting || 'Meeting'}`
                                    }
                                  >
                                    {isAvailable ? (
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
      </div>
    );
  }