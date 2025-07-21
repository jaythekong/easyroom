import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap } from "lucide-react";

interface TimeSlot {
  time: string;
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

  // Generate time slots from 8 AM to 8 PM
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours < 8 || hours >= 20) return -1;
    
    const totalMinutes = (hours - 8) * 60 + minutes;
    const totalTimelineMinutes = 12 * 60; // 8 AM to 8 PM = 12 hours
    return (totalMinutes / totalTimelineMinutes) * 100;
  };

  const isCurrentTimeSlot = (timeSlot: string) => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    const diffInMinutes = Math.abs((now.getTime() - slotTime.getTime()) / (1000 * 60));
    return diffInMinutes < 30;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Room Timeline</h2>
          <p className="text-muted-foreground">
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
          <span>Last updated: {currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Time Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border pb-4">
        <div className="flex items-center">
          <div className="w-64 shrink-0"></div> {/* Room info column */}
          <div className="flex-1 relative">
            <div className="grid grid-cols-24 gap-0 text-xs text-muted-foreground">
              {timeSlots.map((time, index) => (
                <div 
                  key={time} 
                  className={`p-1 text-center border-r border-border/50 ${
                    index % 2 === 0 ? 'font-medium' : 'opacity-50'
                  }`}
                >
                  {index % 2 === 0 ? time : ''}
                </div>
              ))}
            </div>
            {/* Current time indicator */}
            {getCurrentTimePosition() > 0 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 animate-pulse"
                style={{ left: `${getCurrentTimePosition()}%` }}
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Rows */}
      <div className="space-y-3">
        {rooms.map((room) => (
          <Card key={room.id} className="timeline-card overflow-hidden">
            <div className="flex items-center">
              {/* Room Info */}
              <div className="w-64 shrink-0 p-4 border-r border-border">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{room.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{room.capacity} people</span>
                    </div>
                  </div>
                  
                  {room.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{room.location}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {room.amenities.slice(0, 2).map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {room.amenities.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{room.amenities.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative">
                <div className="grid grid-cols-24 gap-0 h-16">
                  {timeSlots.map((time, index) => {
                    const isAvailable = !room.timeSlots.find(ts => ts.time === time && !ts.available);
                    const timeSlot = room.timeSlots.find(ts => ts.time === time);
                    const isCurrent = isCurrentTimeSlot(time);
                    
                    return (
                      <div
                        key={`${room.id}-${time}`}
                        className={`
                          relative border-r border-border/20 h-full cursor-pointer transition-all duration-200
                          ${isAvailable 
                            ? 'bg-success/5 hover:bg-success/20' 
                            : 'bg-danger/10 hover:bg-danger/20'
                          }
                          ${isCurrent ? 'ring-2 ring-primary/50' : ''}
                        `}
                        onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                      >
                        {!isAvailable && timeSlot?.meeting && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-8 bg-danger/20 border border-danger/30 rounded text-xs text-danger flex items-center justify-center px-1 mx-0.5">
                              <span className="truncate font-medium">
                                {timeSlot.meeting}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {isAvailable && isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Button
                              size="sm"
                              className="quick-book-button h-6 text-xs px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickBook(room.id, time);
                              }}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Book
                            </Button>
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

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-success/20 border border-success/30 rounded"></div>
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-danger/20 border border-danger/30 rounded"></div>
          <span className="text-sm text-muted-foreground">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/20 border border-primary rounded"></div>
          <span className="text-sm text-muted-foreground">Available Now</span>
        </div>
      </div>
    </div>
  );
}