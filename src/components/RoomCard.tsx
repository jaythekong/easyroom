import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Monitor, Wifi, Coffee, Video, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Amenity {
  icon: React.ComponentType<any>;
  name: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'busy' | 'upcoming';
  nextAvailable?: string;
  currentMeeting?: string;
  amenities: string[];
  image?: string;
}

interface RoomCardProps {
  room: Room;
  onBook: (roomId: string) => void;
  onViewDetails: (roomId: string) => void;
  onDateChange?: (roomId: string, date: Date) => void;
}

const amenityIcons: Record<string, React.ComponentType<any>> = {
  monitor: Monitor,
  wifi: Wifi,
  coffee: Coffee,
  video: Video,
  projector: Monitor,
  whiteboard: Monitor
};

const getStatusConfig = (status: Room['status']) => {
  switch (status) {
    case 'available':
      return {
        badge: 'success',
        text: 'Available',
        bgClass: 'border-success/20 bg-success/5'
      };
    case 'busy':
      return {
        badge: 'danger',
        text: 'In Use',
        bgClass: 'border-danger/20 bg-danger/5'
      };
    case 'upcoming':
      return {
        badge: 'warning',
        text: 'Upcoming',
        bgClass: 'border-warning/20 bg-warning/5'
      };
  }
};

export function RoomCard({ room, onBook, onViewDetails, onDateChange }: RoomCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const statusConfig = getStatusConfig(room.status);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateChange?.(room.id, date);
    }
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-[var(--shadow-elegant)] ${statusConfig.bgClass} border cursor-pointer`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{room.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Up to {room.capacity} people</span>
            </div>
          </div>
          <Badge 
            variant={statusConfig.badge as any}
            className="font-medium"
          >
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {room.status === 'busy' && room.currentMeeting && (
          <div className="mb-3 p-2 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">Current: {room.currentMeeting}</p>
          </div>
        )}
        
        {room.status === 'upcoming' && room.nextAvailable && (
          <div className="mb-3 p-2 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">Available at {room.nextAvailable}</p>
          </div>
        )}

        {room.amenities.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {room.amenities.slice(0, 4).map((amenity) => {
              const IconComponent = amenityIcons[amenity.toLowerCase()] || Monitor;
              return (
                <div key={amenity} className="flex items-center gap-1">
                  <IconComponent className="h-3 w-3 text-muted-foreground" />
                </div>
              );
            })}
            {room.amenities.length > 4 && (
              <span className="text-xs text-muted-foreground">+{room.amenities.length - 4} more</span>
            )}
          </div>
        )}

        {/* Calendar Selector */}
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  "text-muted-foreground"
                )}
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(room.id)}
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            size="sm"
            onClick={() => onBook(room.id)}
            disabled={room.status === 'busy'}
            className="flex-1"
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}