import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, Zap, Calendar, ChevronLeft, ChevronRight, Expand, Minimize } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  meeting?: string;
  bookedBy?: string;
  date?: string; // For week view
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
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

      {/* Timeline Container - Single scroll for both header and content */}
      <div className="overflow-x-auto">
        {/* Time Header */}
        <div className="sticky top-4 z-10 bg-background border-b pb-2">
          <div className="flex gap-2 min-w-max">
            <div className="flex-shrink-0 w-[200px] text-sm font-medium text-muted-foreground">Rooms</div>
            <div className="flex gap-2">
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

        {/* Room Rows */}
        <div className="space-y-2">
          {rooms.map((room) => {
            const isExpanded = expandedRooms.has(room.id);
            return (
              <div key={room.id} className="bg-card border rounded-lg p-3">
                {/* Main Room Row */}
                <div className="flex gap-2 min-w-max">
                  {/* Room Info with Expand Button */}
                  <div className="flex-shrink-0 w-[200px]">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRoomExpansion(room.id)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <Minimize className="h-3 w-3" />
                        ) : (
                          <Expand className="h-3 w-3" />
                        )}
                      </Button>
                      <div>
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
                    </div>
                  </div>

                  {/* Today's Timeline Slots */}
                  <div className="flex gap-2">
                    {isExpanded ? (
                      // When expanded, show today in the same style as other days
                      <div className="flex flex-col">
                        <div className="text-sm text-muted-foreground mb-1">
                          {format(selectedDate, 'EEE, MMM d')} (Today)
                        </div>
                        <div className="flex gap-2">
                          {timeSlots.map(({ time }) => {
                            const roomTimeSlot = room.timeSlots.find(ts => ts.time === time);
                            const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                            const isCurrent = isCurrentHour(time);
                            
                            return (
                              <div
                                key={`${room.id}-today-${time}`}
                                className={`
                                  flex-shrink-0 w-24 h-10 rounded border cursor-pointer flex items-center justify-center text-xs
                                  ${isAvailable 
                                    ? 'border-success/30 bg-success/10 hover:bg-success/20 text-success' 
                                    : 'border-danger/30 bg-danger/10 text-danger'
                                  }
                                  ${isCurrent ? 'ring-1 ring-primary/50' : ''}
                                `}
                                onClick={() => isAvailable && onTimeSlotSelect(room.id, time)}
                              >
                                {isAvailable ? (
                                  isCurrent ? (
                                    <Button
                                      size="sm"
                                      className="h-6 w-full text-xs px-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickBook(room.id, time);
                                      }}
                                    >
                                      Book
                                    </Button>
                                  ) : (
                                    <span className="text-success-foreground text-xs">Free</span>
                                  )
                                ) : (
                                  <span className="text-danger-foreground text-xs">Busy</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // When not expanded, show normal horizontal layout
                      timeSlots.map(({ time }) => {
                        const roomTimeSlot = room.timeSlots.find(ts => ts.time === time);
                        const isAvailable = !roomTimeSlot || roomTimeSlot.available;
                        const isCurrent = isCurrentHour(time);
                        
                        return (
                          <div
                            key={`${room.id}-today-${time}`}
                            className={`
                              flex-shrink-0 w-24 h-12 rounded border cursor-pointer flex items-center justify-center text-xs
                              ${isAvailable 
                                ? 'border-success/30 bg-success/10 hover:bg-success/20 text-success' 
                                : 'border-danger/30 bg-danger/10 text-danger'
                              }
                              ${isCurrent ? 'ring-1 ring-primary/50' : ''}
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
                                <span className="text-success-foreground">Free</span>
                              )
                            ) : (
                              <span className="text-danger-foreground">Busy</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Expanded Week View for this Room */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="space-y-2">
                      {weekDays.slice(1).map((day, index) => (
                        <div key={day.toISOString()} className="flex gap-2 min-w-max">
                          {/* Date Label */}
                          <div className="flex-shrink-0 w-[200px] flex items-center">
                            <div className="text-sm text-muted-foreground pl-8">
                              {format(day, 'EEE, MMM d')}
                            </div>
                          </div>

                          {/* Date's Timeline Slots */}
                          <div className="flex gap-2">
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
                                    flex-shrink-0 w-24 h-10 rounded border cursor-pointer flex items-center justify-center text-xs
                                    ${isAvailable 
                                      ? 'border-success/30 bg-success/10 hover:bg-success/20 text-success' 
                                      : 'border-danger/30 bg-danger/10 text-danger'
                                    }
                                    ${isCurrent ? 'ring-1 ring-primary/50' : ''}
                                  `}
                                  onClick={() => isAvailable && onTimeSlotSelect(room.id, `${dayKey}-${time}`)}
                                >
                                  {isAvailable ? (
                                    isCurrent ? (
                                      <Button
                                        size="sm"
                                        className="h-6 w-full text-xs px-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onQuickBook(room.id, `${dayKey}-${time}`);
                                        }}
                                      >
                                        Book
                                      </Button>
                                    ) : (
                                      <span className="text-success-foreground text-xs">Free</span>
                                    )
                                  ) : (
                                    <span className="text-danger-foreground text-xs">Busy</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}