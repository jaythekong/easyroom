import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { format, addHours, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  attendees?: number;
  description?: string;
}

interface DemoBookingModalProps {
  room: DemoRoom;
  onConfirm: (booking: any) => void;
  onCancel: () => void;
  initialDate?: Date;
  initialTimeSlot?: string;
  editingBooking?: DemoBooking;
}

export function DemoBookingModal({
  room,
  onConfirm,
  onCancel,
  initialDate = new Date(),
  initialTimeSlot = "",
  editingBooking
}: DemoBookingModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    date: format(initialDate, "yyyy-MM-dd"),
    startTime: initialTimeSlot || "09:00",
    endTime: "",
    attendees: "",
    description: ""
  });

  // Auto-populate form if editing
  useEffect(() => {
    if (editingBooking) {
      const startDate = new Date(editingBooking.start_time);
      const endDate = new Date(editingBooking.end_time);
      
      setFormData({
        title: editingBooking.title,
        date: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        attendees: editingBooking.attendees?.toString() || "",
        description: editingBooking.description || ""
      });
    }
  }, [editingBooking]);

  // Auto-set end time when start time changes
  useEffect(() => {
    if (formData.startTime && !formData.endTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours + 1, minutes, 0, 0);
      setFormData(prev => ({
        ...prev,
        endTime: format(endTime, "HH:mm")
      }));
    }
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting title",
        variant: "destructive"
      });
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

    if (endDateTime <= startDateTime) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }

    const bookingData = {
      title: formData.title.trim(),
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      attendees: formData.attendees ? parseInt(formData.attendees) : undefined,
      description: formData.description.trim() || undefined
    };

    onConfirm(bookingData);
    
    toast({
      title: "Success!",
      description: `${editingBooking ? 'Updated' : 'Created'} booking for ${room.name}`,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {editingBooking ? 'Edit Booking' : 'Book Room'}
          </DialogTitle>
        </DialogHeader>

        {/* Room Info */}
        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="font-medium">{room.name}</div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Up to {room.capacity} people
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {room.location}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            ✨ Demo booking - not saved to real database
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meeting Title */}
          <div>
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Team Standup"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div>
              <Label htmlFor="attendees">Attendees</Label>
              <Input
                id="attendees"
                type="number"
                value={formData.attendees}
                onChange={(e) => handleInputChange('attendees', e.target.value)}
                placeholder="Optional"
                min="1"
                max={room.capacity.toString()}
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional meeting details..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              {editingBooking ? 'Update Booking' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}