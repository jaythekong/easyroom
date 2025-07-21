import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap, Calendar, ChevronLeft, ChevronRight, Expand, Minimize } from "lucide-react";
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
}

interface Booking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
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

  // Fetch bookings from database
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

  // Generate rooms with real booking data
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
          
          const timeSlot: TimeSlot = {
            time,
            endTime,
            available: !booking,
            meeting: booking?.title,
            bookingId: booking?.id,
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
  }, [selectedDate]);

  useEffect(() => {
    generateRoomsWithBookings();
  }, [rooms, bookings, selectedDate]);

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

      {/* Timeline Table */}
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="flex">
          {/* Fixed Room Names Column */}
          <div className="flex-shrink-0 w-[260px] border-r bg-muted/30">
            {/* Header space */}
            <div className="h-16 border-b bg-background/95 backdrop-blur flex">
              <div className="w-12 border-r"></div>
              <div className="flex-1"></div>
            </div>
            
            {/* Room Names */}
            <div className="divide-y divide-border/50">
              {roomsWithBookings.map((room) => {
                const isExpanded = expandedRooms.has(room.id);
                return (
                  <div key={`room-name-${room.id}`}>
                    {!isExpanded ? (
                      // Collapsed: Room name only
                      <div className="min-h-[80px] flex hover:bg-muted/20 transition-colors">
                        <div className="w-12 border-r bg-muted/10 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRoomExpansion(room.id)}
                            className="h-6 w-6 p-0 hover:bg-muted/50"
                          >
                            <Expand className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 p-4 bg-card/80 backdrop-blur flex items-center">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base text-foreground truncate">{room.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span>{room.capacity}</span>
                              {room.location && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="truncate">{room.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Expanded: Room header + week days
                        <>
                          {/* Room Header */}
                          <div className="min-h-[64px] flex border-b bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="w-12 border-r bg-muted/10 flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRoomExpansion(room.id)}
                                className="h-6 w-6 p-0 hover:bg-muted/50"
                              >
                                <Minimize className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1 p-4 flex items-center">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-base text-foreground">{room.name}</h3>
                                  <Badge variant="secondary" className="text-xs font-medium">
                                    <Users className="h-3 w-3 mr-1" />
                                    {room.capacity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Week Day Labels */}
                          {weekDays.map((day) => (
                            <div key={`day-label-${day.toISOString()}`} className="h-[60px] flex hover:bg-muted/10 transition-colors border-b last:border-b-0">
                              <div className="w-12 border-r bg-muted/5"></div>
                              <div className="flex-1 px-4 bg-muted/5 flex items-center">
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isSameDay(day, selectedDate) 
                                      ? 'bg-primary text-primary-foreground shadow-sm' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {format(day, 'd')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">
                                      {isSameDay(day, selectedDate) ? `Today ${format(day, 'MMM d')}` : format(day, 'EEE MMM d')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Scrollable Time Content - Headers and Slots Together */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-max">
              {/* Time Headers */}
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b h-16">
                <div className="flex h-full">
                  {timeSlots.map(({ time }) => (
                    <div 
                      key={`header-${time}`} 
                      className={`flex-shrink-0 w-24 flex items-center justify-center border-r last:border-r-0 text-sm font-semibold transition-colors ${
                        isCurrentHour(time) 
                          ? 'text-primary bg-primary/10 border-primary/20' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Slots Content */}
              <div className="divide-y divide-border/50">
                {roomsWithBookings.map((room) => {
                  const isExpanded = expandedRooms.has(room.id);
                  return (
                    <div key={`time-slots-${room.id}`}>
                      {!isExpanded ? (
                        // Collapsed: Today's time slots
                        <div className="flex min-h-[80px] hover:bg-muted/20 transition-colors">
                          {timeSlots.map(({ time }) => {
                            const todayKey = format(selectedDate, 'yyyy-MM-dd');
                            const roomTimeSlot = room.timeSlots.find(ts => 
                              ts.time === time && ts.date === todayKey
                            );
                            const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                            const isCurrent = isCurrentHour(time);
                            
                            return (
                              <div
                                key={`${room.id}-today-${time}`}
                                className={`
                                  flex-shrink-0 w-24 border-r last:border-r-0 cursor-pointer flex items-center justify-center text-xs font-semibold transition-all duration-200 min-h-[80px]
                                  ${isAvailable 
                                    ? 'hover:bg-success/15 text-success-foreground bg-success/5 hover:scale-[1.02] hover:shadow-sm' 
                                    : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed'
                                  }
                                  ${isCurrent ? 'ring-2 ring-primary/40 bg-primary/10 shadow-inner' : ''}
                                `}
                                onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                              >
                                {isAvailable ? (
                                  isCurrent ? (
                                    <Button
                                      size="sm"
                                      className="h-8 w-[88px] text-xs font-medium animate-pulse shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickBook(room.id, time);
                                      }}
                                    >
                                      Book Now
                                    </Button>
                                  ) : (
                                    <span className="text-success font-bold">Free</span>
                                  )
                                ) : (
                                  <div className="text-center">
                                    <div className="text-destructive font-bold">Booked</div>
                                    {roomTimeSlot?.meeting && (
                                      <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                                        {roomTimeSlot.meeting}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Expanded: Room header + all week days
                        <>
                          {/* Room Header Spacer */}
                          <div className="flex border-b bg-muted/10 min-h-[64px] hover:bg-muted/20 transition-colors">
                            {timeSlots.map(({ time }) => (
                              <div 
                                key={`${room.id}-room-header-${time}`}
                                className="flex-shrink-0 w-24 border-r last:border-r-0 bg-muted/5"
                              />
                            ))}
                          </div>
                          
                          {/* Week Days Time Slots */}
                          {weekDays.map((day) => (
                            <div key={`${room.id}-${day.toISOString()}`} className="flex hover:bg-muted/10 transition-colors h-[60px] border-b last:border-b-0">
                              {timeSlots.map(({ time }) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const roomTimeSlot = room.timeSlots.find(ts => 
                                  ts.time === time && ts.date === dayKey
                                );
                                const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                                const isCurrent = isCurrentHour(time, day);
                                
                                return (
                                  <div
                                    key={`${room.id}-${dayKey}-${time}`}
                                    className={`
                                      flex-shrink-0 w-24 border-r last:border-r-0 cursor-pointer flex items-center justify-center text-xs font-semibold transition-all duration-200 min-h-[60px]
                                      ${isAvailable 
                                        ? 'hover:bg-success/15 text-success-foreground bg-success/5' 
                                        : 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/15 cursor-not-allowed'
                                      }
                                      ${isCurrent ? 'ring-2 ring-primary/40 bg-primary/10' : ''}
                                    `}
                                    onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                                  >
                                    {isAvailable ? (
                                      isCurrent ? (
                                        <Button
                                          size="sm"
                                          className="h-6 w-[80px] text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onQuickBook(room.id, time);
                                          }}
                                        >
                                          Book
                                        </Button>
                                      ) : (
                                        <span className="text-success font-bold">Free</span>
                                      )
                                    ) : (
                                      <div className="text-center">
                                        <div className="text-destructive font-bold">Booked</div>
                                        {roomTimeSlot?.meeting && (
                                          <div className="text-xs text-muted-foreground truncate max-w-[70px]">
                                            {roomTimeSlot.meeting}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}