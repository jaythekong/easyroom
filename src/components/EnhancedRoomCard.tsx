import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock, Users, MapPin, Monitor, Wifi, Coffee, Video, Zap, Star } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  amenities: string[];
  status: 'available' | 'busy' | 'upcoming';
  nextAvailable?: string;
  currentMeeting?: string;
}

interface EnhancedRoomCardProps {
  room: Room;
  onBook: (roomId: string) => void;
  onViewDetails: (roomId: string) => void;
  onQuickBook?: (roomId: string) => void;
  onDateChange?: (roomId: string, date: Date) => void;
  showQuickActions?: boolean;
}

const amenityIcons: Record<string, React.ComponentType<any>> = {
  monitor: Monitor,
  wifi: Wifi,
  coffee: Coffee,
  "video conferencing": Video,
  projector: Monitor,
  tv: Monitor,
  whiteboard: Monitor,
  flipchart: Monitor,
  microphone: Video,
  "kitchen access": Coffee,
};

export const EnhancedRoomCard = memo(function EnhancedRoomCard({ 
  room, 
  onBook, 
  onViewDetails, 
  onQuickBook,
  onDateChange,
  showQuickActions = true 
}: EnhancedRoomCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateChange?.(room.id, date);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return {
          variant: 'success' as const,
          text: 'Available',
          bgClass: 'status-available',
          icon: null
        };
      case 'busy':
        return {
          variant: 'danger' as const,
          text: 'In Use',
          bgClass: 'status-busy',
          icon: null
        };
      case 'upcoming':
        return {
          variant: 'warning' as const,
          text: 'Available Soon',
          bgClass: 'status-upcoming',
          icon: Clock
        };
      default:
        return {
          variant: 'secondary' as const,
          text: 'Unknown',
          bgClass: '',
          icon: null
        };
    }
  };

  const statusConfig = getStatusConfig(room.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className={`
        timeline-card group relative overflow-hidden transition-all duration-300
        ${isHovered ? 'scale-[1.02] shadow-xl' : ''}
        ${room.status === 'available' ? 'hover:ring-2 hover:ring-success/30' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status indicator strip */}
      <div className={`absolute top-0 left-0 w-full h-1 ${statusConfig.bgClass}`}></div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:gradient-text transition-all duration-300">
              {room.name}
            </CardTitle>
            
            {room.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{room.location}</span>
              </div>
            )}
          </div>

          <Badge 
            variant={statusConfig.variant} 
            className={`flex items-center gap-1 ${statusConfig.bgClass}`}
          >
            {StatusIcon && <StatusIcon className="h-3 w-3" />}
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Capacity */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{room.capacity} people</span>
        </div>

        {/* Current status info */}
        {room.status === 'busy' && room.currentMeeting && (
          <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
            <p className="text-sm text-danger font-medium">Currently in use</p>
            <p className="text-xs text-muted-foreground">{room.currentMeeting}</p>
          </div>
        )}

        {room.status === 'upcoming' && room.nextAvailable && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-sm text-warning font-medium">Available at {room.nextAvailable}</p>
          </div>
        )}

        {/* Amenities */}
        {room.amenities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Amenities
            </p>
            <div className="flex flex-wrap gap-1">
              {room.amenities.slice(0, 4).map((amenity) => {
                const IconComponent = amenityIcons[amenity.toLowerCase()] || Monitor;
                return (
                  <div
                    key={amenity}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 text-muted-foreground rounded-md border border-border/50"
                  >
                    <IconComponent className="h-3 w-3" />
                    <span>{amenity}</span>
                  </div>
                );
              })}
              {room.amenities.length > 4 && (
                <div className="flex items-center px-2 py-1 text-xs bg-muted/50 text-muted-foreground rounded-md border border-border/50">
                  +{room.amenities.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Selector */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select Date
          </p>
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            className={`${room.status === 'available' ? 'quick-book-button' : ''} flex-1 h-9`}
            onClick={() => room.status === 'available' ? onBook(room.id) : onViewDetails(room.id)}
          >
            {room.status === 'available' ? (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Book Room
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                View Details
              </>
            )}
          </Button>
        </div>

        {/* Premium available now indicator */}
        {room.status === 'available' && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-success text-success-foreground text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
              Available Now
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});