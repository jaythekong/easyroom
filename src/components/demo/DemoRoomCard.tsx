import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Wifi, Monitor, Phone, Coffee, Volume2, FileText } from "lucide-react";

interface DemoRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  status: 'available' | 'busy' | 'upcoming';
  photo_url?: string;
}

interface DemoRoomCardProps {
  room: DemoRoom;
  onBook: (roomId: string) => void;
  onViewDetails: (roomId: string) => void;
}

const amenityIcons = {
  'projector': Monitor,
  'whiteboard': FileText,
  'conference-phone': Phone,
  'coffee': Coffee,
  'monitor': Monitor,
  'sound-system': Volume2,
  'flip-chart': FileText,
  'wifi': Wifi,
};

export function DemoRoomCard({ room, onBook, onViewDetails }: DemoRoomCardProps) {
  const getStatusConfig = (status: DemoRoom['status']) => {
    switch (status) {
      case 'available':
        return {
          badgeVariant: 'default' as const,
          text: 'Available',
          bgClass: 'bg-green-50 dark:bg-green-950/20'
        };
      case 'busy':
        return {
          badgeVariant: 'destructive' as const,
          text: 'Busy',
          bgClass: 'bg-red-50 dark:bg-red-950/20'
        };
      case 'upcoming':
        return {
          badgeVariant: 'secondary' as const,
          text: 'Upcoming Meeting',
          bgClass: 'bg-yellow-50 dark:bg-yellow-950/20'
        };
    }
  };

  const statusConfig = getStatusConfig(room.status);

  return (
    <Card className={`hover-scale transition-all duration-200 ${statusConfig.bgClass} border-border/50`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              {room.name}
            </CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1" />
              {room.location}
            </div>
          </div>
          <Badge variant={statusConfig.badgeVariant} className="text-xs">
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Capacity */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            <span>Capacity: {room.capacity} people</span>
          </div>

          {/* Demo status indicator */}
          <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded">
            ✨ Demo room - Try booking!
          </div>

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Amenities</span>
              <div className="flex flex-wrap gap-2">
                {room.amenities.slice(0, 4).map((amenity) => {
                  const IconComponent = amenityIcons[amenity as keyof typeof amenityIcons];
                  return IconComponent ? (
                    <div
                      key={amenity}
                      className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                    >
                      <IconComponent className="h-3 w-3" />
                      <span className="capitalize">{amenity.replace('-', ' ')}</span>
                    </div>
                  ) : null;
                })}
                {room.amenities.length > 4 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    +{room.amenities.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
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
              {room.status === 'busy' ? 'Busy' : 'Book Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}