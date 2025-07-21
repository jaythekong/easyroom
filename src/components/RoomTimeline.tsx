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
    <div className="space-y-4">
      {/* Simple Header */}
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
            <span className="text-sm">
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

      {/* Time Header */}
      <div className="sticky top-4 z-10 bg-background border-b pb-2">
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-[200px] text-sm font-medium text-muted-foreground">Rooms</div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {timeSlots.map(({ time }) => (
                <div 
                  key={time} 
                  className={`flex-shrink-0 w-24 text-center p-2 text-xs ${
                    isCurrentHour(time) 
                      ? 'text-primary font-medium' 
                      : 'text-muted-foreground'
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
      <div className="space-y-2">
        {rooms.map((room) => (
          <div key={room.id} className="bg-card border rounded-lg p-3">
            <div className="flex gap-2">
              {/* Room Info */}
              <div className="flex-shrink-0 w-[200px]">
                <h3 className="font-medium text-sm">{room.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{room.capacity}</span>
                  {room.location && (
                    <>
                      <span>•</span>
                      <span>{room.location}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Slots */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {timeSlots.map(({ time }) => {
                    const roomTimeSlot = room.timeSlots.find(ts => ts.time === time);
                    const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                    const isCurrent = isCurrentHour(time);
                    
                    return (
                      <div
                        key={`${room.id}-${time}`}
                        className={`
                          flex-shrink-0 w-24 h-12 rounded border cursor-pointer flex items-center justify-center text-xs
                          ${isAvailable 
                            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                            : 'border-red-200 bg-red-50'
                          }
                          ${isCurrent ? 'ring-1 ring-blue-300' : ''}
                        `}
                        onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                      >
                        {isAvailable ? (
                          isCurrent ? (
                            <Button
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickBook(room.id, time);
                              }}
                            >
                              Book
                            </Button>
                          ) : (
                            <span className="text-green-600">Free</span>
                          )
                        ) : (
                          <span className="text-red-600">Busy</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}