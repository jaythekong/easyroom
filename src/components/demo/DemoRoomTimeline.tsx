import React from 'react';
import { useDemoContext } from '@/contexts/DemoContext';

interface DemoRoomTimelineProps {
  rooms: any[];
  selectedDate: Date;
  onQuickBook: (roomId: string, timeSlot: string) => void;
  onTimeSlotSelect: (roomId: string, timeSlot: string) => void;
  onBookingUpdate?: () => void;
  onDateSelect: (date: Date) => void;
  expandedRooms: Set<string>;
  onExpandedRoomsChange: (expandedRooms: Set<string>) => void;
  refreshTrigger?: number;
}

export function DemoRoomTimeline({
  rooms,
  selectedDate,
  onQuickBook,
  onTimeSlotSelect,
  onBookingUpdate,
  onDateSelect,
  expandedRooms,
  onExpandedRoomsChange,
  refreshTrigger
}: DemoRoomTimelineProps) {
  const { bookings } = useDemoContext();

  // Simple timeline view for demo
  return (
    <div className="space-y-4">
      <div className="text-center p-8 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📅 Timeline View</h3>
        <p className="text-muted-foreground mb-4">
          Interactive room timeline with {rooms.length} demo rooms and {bookings.length} sample bookings
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-background p-4 rounded border">
              <h4 className="font-medium">{room.name}</h4>
              <p className="text-sm text-muted-foreground">{room.location}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Capacity: {room.capacity} people
              </p>
              <button
                onClick={() => onTimeSlotSelect(room.id, new Date().toISOString())}
                className="mt-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
              >
                Quick Book
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ✨ In the real app, this shows a full weekly timeline with hourly slots
        </p>
      </div>
    </div>
  );
}