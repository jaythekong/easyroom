import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, subDays, startOfDay, addHours } from "date-fns";

interface DemoRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
}

interface DemoBooking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_profiles?: {
    display_name?: string;
  };
}

interface DemoRoomTimelineProps {
  rooms: DemoRoom[];
  bookings: DemoBooking[];
  selectedDate: Date;
  onQuickBook: (roomId: string, timeSlot: string) => void;
  onTimeSlotSelect: (roomId: string, timeSlot: string) => void;
  onDateSelect: (date: Date) => void;
  onEditBooking?: (booking: DemoBooking) => void;
}

export function DemoRoomTimeline({
  rooms,
  bookings,
  selectedDate,
  onQuickBook,
  onTimeSlotSelect,
  onDateSelect,
  onEditBooking
}: DemoRoomTimelineProps) {
  const [currentTime] = useState(new Date());

  // Generate time slots (8 AM to 8 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        hour
      });
    }
    return slots;
  }, []);

  // Get the week days to display (7 days starting from selected date's week)
  const weekDays = useMemo(() => {
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [selectedDate]);

  // Check if a booking overlaps with a time slot
  const doesBookingOverlapSlot = (booking: DemoBooking, date: Date, hour: number) => {
    const slotStart = addHours(startOfDay(date), hour);
    const slotEnd = addHours(slotStart, 1);
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    return bookingStart < slotEnd && bookingEnd > slotStart;
  };

  // Navigate to previous/next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 7)
      : addDays(selectedDate, 7);
    onDateSelect(newDate);
  };

  const isCurrentTime = (date: Date, hour: number) => {
    return isSameDay(date, currentTime) && 
           hour === currentTime.getHours();
  };

  const isPastTimeSlot = (date: Date, hour: number) => {
    const slotTime = addHours(startOfDay(date), hour);
    return slotTime < currentTime;
  };

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Room Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Click on available slots to book rooms
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateSelect(date)}
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
      </div>

      {/* Timeline Grid */}
      <div className="space-y-4">
        {rooms.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">{room.name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.capacity}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {room.location}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Demo Room
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Days Header */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="text-xs font-medium text-muted-foreground p-2">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "text-xs font-medium text-center p-2 rounded",
                      isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
                      isSameDay(day, currentTime) && !isSameDay(day, selectedDate) && "bg-secondary"
                    )}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xs opacity-70">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-1">
                {timeSlots.map(({ time, hour }) => (
                  <div key={time} className="grid grid-cols-8 gap-1">
                    <div className="text-xs text-muted-foreground p-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {time}
                    </div>
                    
                    {weekDays.map((day) => {
                      const dayBookings = bookings.filter(booking => 
                        booking.room_id === room.id && 
                        doesBookingOverlapSlot(booking, day, hour)
                      );
                      
                      const hasBooking = dayBookings.length > 0;
                      const isCurrentSlot = isCurrentTime(day, hour);
                      const isPast = isPastTimeSlot(day, hour);
                      
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className={cn(
                            "h-8 rounded cursor-pointer transition-all duration-200 border",
                            hasBooking
                              ? "bg-primary/20 border-primary/40"
                              : isPast
                              ? "bg-muted/50 border-muted cursor-not-allowed"
                              : "bg-background border-border hover:bg-primary/10 hover:border-primary/30",
                            isCurrentSlot && "ring-2 ring-primary/50"
                          )}
                          onClick={() => {
                            if (!hasBooking && !isPast) {
                              const slotDateTime = addHours(startOfDay(day), hour);
                              onTimeSlotSelect(room.id, slotDateTime.toISOString());
                            } else if (hasBooking && onEditBooking) {
                              onEditBooking(dayBookings[0]);
                            }
                          }}
                        >
                          {hasBooking && (
                            <div className="text-xs p-1 truncate text-primary font-medium">
                              {dayBookings[0].title}
                            </div>
                          )}
                          {isCurrentSlot && !hasBooking && (
                            <div className="text-xs p-1 text-primary font-medium">
                              Now
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-background border border-border rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/20 border border-primary/40 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted/50 border border-muted rounded"></div>
          <span>Past</span>
        </div>
      </div>
    </div>
  );
}