import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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
            <div key={room.id} className="bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              {/* Room Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{room.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{room.capacity}</span>
                    </div>
                    {room.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{room.location}</span>
                      </div>
                    )}
                    {room.amenities.length > 0 && (
                      <div className="px-2 py-0.5 bg-muted rounded-full text-xs">
                        {room.amenities.length} amenities
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRoomExpansion(room.id)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {!isExpanded ? (
                /* Today's Timeline */
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </div>
                  <ScrollArea className="w-full">
                    <div className="flex gap-1 min-w-max pb-2">
                      {timeSlots.map(({ time }) => {
                        const roomTimeSlot = room.timeSlots.find(ts => 
                          ts.time === time && ts.date === todayKey
            )
                        const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                        const isCurrent = isCurrentHour(time);
                        const isDowntime = roomTimeSlot?.isDowntime;
                        
                        return (
                          <div
                            key={`${room.id}-${time}`}
                            className={`
                              relative flex-shrink-0 w-16 h-12 rounded-lg cursor-pointer flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 border
                              ${isAvailable 
                                ? 'bg-success/5 hover:bg-success/10 border-success/20 text-success-foreground' 
                                : isDowntime
                                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                                  : 'bg-destructive/5 border-destructive/20 text-destructive-foreground'
                              }
                              ${isCurrent ? 'ring-2 ring-primary/50 bg-primary/10' : ''}
                            `}
                            onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                          >
                            <div className="text-xs opacity-60 mb-0.5">{time}</div>
                            {isAvailable ? (
                              isCurrent ? (
                                <div className="text-primary font-semibold text-xs">NOW</div>
                              ) : (
                                <div className="w-2 h-1 bg-success rounded-full"></div>
                              )
                            ) : (
                              <div className="w-2 h-1 bg-current rounded-full opacity-50"></div>
                            )}
                            
                            {isCurrent && isAvailable && (
                              <div className="absolute -top-2 -right-2">
                                <Button
                                  size="sm"
                                  className="h-6 w-6 p-0 text-xs rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickBook(room.id, time);
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                /* Week View */
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Week of {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d')}
                  </div>
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const isToday = isSameDay(day, selectedDate);
                    
                    return (
                       <div key={`${room.id}-${dayKey}`} className="flex items-center gap-3">
                         <div className="flex items-center gap-2 w-24">
                           <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-primary' : 'bg-muted'}`}></div>
                           <span className={`text-sm ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                             {format(day, 'EEE')}
                           </span>
                         </div>
                         <div className="flex gap-1">
                           {timeSlots.map(({ time }) => {
                             const roomTimeSlot = room.timeSlots.find(ts => 
                               ts.time === time && ts.date === dayKey
                             );
                             const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                             const isDowntime = roomTimeSlot?.isDowntime;
                             
                             return (
                               <div
                                 key={`${room.id}-${dayKey}-${time}`}
                                 className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-200 ${
                                   isAvailable 
                                     ? 'bg-success hover:scale-125' 
                                     : isDowntime
                                       ? 'bg-orange-400'
                                       : 'bg-destructive/60'
                                 }`}
                                 onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                                 title={`${time} - ${isAvailable ? 'Available' : isDowntime ? 'Downtime' : 'Booked'}`}
                               />
                             );
                           })}
                         </div>
                       </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  }