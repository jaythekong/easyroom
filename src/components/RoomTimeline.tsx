import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  meeting?: string;
  bookedBy?: string;
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
}

export function RoomTimeline({ rooms, selectedDate, onQuickBook, onTimeSlotSelect }: RoomTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedHourRange, setSelectedHourRange] = useState({ start: 8, end: 18 });

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentHour = () => {
    return new Date().getHours();
  };

  const isCurrentHour = (timeSlot: string) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    return hour === getCurrentHour();
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

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold gradient-text">Room Timeline</h2>
            <p className="text-muted-foreground text-lg">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Updated: {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Time Range Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftTimeRange('earlier')}
              disabled={selectedHourRange.start <= 6}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Earlier
            </Button>
            <div className="text-sm font-medium px-4 py-2 bg-muted/50 rounded-lg">
              {selectedHourRange.start}:00 - {selectedHourRange.end}:00
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftTimeRange('later')}
              disabled={selectedHourRange.end >= 22}
            >
              Later
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-success/20 border border-success/30 rounded"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-danger/20 border border-danger/30 rounded"></div>
              <span className="text-sm">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/20 border border-primary rounded animate-pulse"></div>
              <span className="text-sm">Available Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Header */}
      <div className="sticky top-20 z-10 glass-card p-4 rounded-xl">
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-[280px] font-medium text-muted-foreground">Rooms</div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {timeSlots.map(({ time }) => (
                <div 
                  key={time} 
                  className={`flex-shrink-0 w-32 text-center p-3 rounded-lg font-medium text-sm transition-all ${
                    isCurrentHour(time) 
                      ? 'bg-primary/10 text-primary border border-primary/30' 
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Room Rows */}
      <div className="space-y-4">
        {rooms.map((room) => (
          <Card key={room.id} className="timeline-card overflow-hidden">
            <div className="flex gap-4 p-6">
              {/* Room Info */}
              <div className="flex-shrink-0 w-[280px] space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{room.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{room.capacity} people</span>
                  </div>
                </div>
                
                {room.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{room.location}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {room.amenities.slice(0, 3).map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {room.amenities.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{room.amenities.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timeline Slots */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {timeSlots.map(({ time, endTime }) => {
                    const roomTimeSlot = room.timeSlots.find(ts => ts.time === time);
                    const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                    const isCurrent = isCurrentHour(time);
                    
                    return (
                      <div
                        key={`${room.id}-${time}`}
                        className={`
                          flex-shrink-0 w-32 relative min-h-[80px] rounded-lg border-2 cursor-pointer transition-all duration-200 p-3
                          ${isAvailable 
                            ? 'border-success/30 bg-success/5 hover:bg-success/15 hover:border-success/50' 
                            : 'border-danger/30 bg-danger/5 hover:bg-danger/15'
                          }
                          ${isCurrent ? 'ring-2 ring-primary/50 animate-pulse' : ''}
                        `}
                        onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                      >
                        {isAvailable ? (
                          <div className="h-full flex flex-col justify-between">
                            <div className="text-xs text-muted-foreground font-medium">
                              {time} - {endTime}
                            </div>
                            {isCurrent && (
                              <Button
                                size="sm"
                                className="quick-book-button w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickBook(room.id, time);
                                }}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Book Now
                              </Button>
                            )}
                            {!isCurrent && (
                              <div className="text-center">
                                <Badge variant="outline" className="text-xs text-success">
                                  Available
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col justify-between">
                            <div className="text-xs text-muted-foreground font-medium">
                              {time} - {endTime}
                            </div>
                            <div className="text-center">
                              <Badge variant="outline" className="text-xs text-danger mb-1">
                                Booked
                              </Badge>
                              {roomTimeSlot?.meeting && (
                                <div className="text-xs text-danger font-medium truncate">
                                  {roomTimeSlot.meeting}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">
              Need something specific? Try these shortcuts
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
            <Button className="quick-book-button">
              <Zap className="h-4 w-4 mr-2" />
              Book Any Available
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}