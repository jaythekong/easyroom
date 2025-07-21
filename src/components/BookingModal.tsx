import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Users, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onBookingConfirm: (booking: any) => void;
  initialDate?: Date;
  initialStartTime?: string;
  existingBooking?: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    attendees?: number;
    recurring: string;
  } | null;
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

export function BookingModal({ isOpen, onClose, room, onBookingConfirm, initialDate, initialStartTime, existingBooking }: BookingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: initialDate || new Date(),
    startTime: initialStartTime || "",
    endTime: "",
    attendees: "",
    description: "",
    recurring: "none"
  });

  // Update form data when initial props change
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Reset form data when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      console.log('📝 BookingModal opened with data:', {
        existingBooking,
        initialDate,
        initialStartTime,
        room
      });

      if (existingBooking) {
        // Pre-fill form with existing booking data
        const startDate = new Date(existingBooking.start_time);
        const endDate = new Date(existingBooking.end_time);
        
        console.log('📝 Existing booking data:', {
          id: existingBooking.id,
          title: existingBooking.title,
          description: existingBooking.description,
          start_time: existingBooking.start_time,
          end_time: existingBooking.end_time,
          attendees: existingBooking.attendees,
          recurring: existingBooking.recurring,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        const newFormData = {
          title: existingBooking.title || "",
          date: startDate,
          startTime: format(startDate, 'HH:mm'),
          endTime: format(endDate, 'HH:mm'),
          attendees: existingBooking.attendees?.toString() || "",
          description: existingBooking.description || "",
          recurring: existingBooking.recurring || "none"
        };

        console.log('📝 Setting form data:', newFormData);
        setFormData(newFormData);
      } else {
        const newFormData = {
          title: "",
          date: initialDate || new Date(),
          startTime: initialStartTime || "",
          endTime: "",
          attendees: "",
          description: "",
          recurring: "none"
        };
        console.log('📝 Setting new booking form data:', newFormData);
        setFormData(newFormData);
      }
    }
  }, [isOpen, initialDate, initialStartTime, existingBooking]);

  // Filter end time options to only show times after start time
  const getAvailableEndTimes = () => {
    if (!formData.startTime) return timeSlots;
    
    const startIndex = timeSlots.findIndex(time => time === formData.startTime);
    return timeSlots.slice(startIndex + 1); // Only show times after start time
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    console.log("Booking attempt - User:", user, "Room:", room);
    
    if (!user || !room) {
      console.log("Booking failed: Missing user or room", { user: !!user, room: !!room });
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a room.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate required fields
    if (!formData.title || !formData.startTime || !formData.endTime) {
      console.log("Validation failed:", { 
        title: formData.title, 
        startTime: formData.startTime, 
        endTime: formData.endTime 
      });
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    console.log("Form data before submission:", formData);

    try {
      // Create datetime strings
      const startDateTime = `${format(formData.date, 'yyyy-MM-dd')}T${formData.startTime}:00`;
      const endDateTime = `${format(formData.date, 'yyyy-MM-dd')}T${formData.endTime}:00`;

      console.log("DateTime strings:", { startDateTime, endDateTime });

      // Get user's organization ID
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log("Profile fetch result:", { profile, profileError });

      if (profileError || !profile?.organization_id) {
        console.error('Profile/organization error:', profileError);
        throw new Error('User organization not found - please contact admin');
      }

      const bookingData = {
        room_id: room.id,
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        start_time: startDateTime,
        end_time: endDateTime,
        attendees: parseInt(formData.attendees) || 1,
        recurring: formData.recurring,
        organization_id: profile.organization_id
      };

      console.log("About to create/update booking with:", bookingData);

      let booking, error;

      if (existingBooking) {
        // Update existing booking
        const { data, error: updateError } = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('id', existingBooking.id)
          .select()
          .single();
        booking = data;
        error = updateError;
      } else {
        // Create new booking
        const { data, error: insertError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();
        booking = data;
        error = insertError;
      }

      console.log("Booking operation result:", { booking, error });

      if (error) throw error;

      // Call the confirmation callback
      onBookingConfirm(booking);
      
      toast({
        title: existingBooking ? "Booking Updated!" : "Booking Confirmed!",
        description: `${room.name} has been ${existingBooking ? 'updated' : 'booked'} for ${format(formData.date, "PPP")} from ${formData.startTime} to ${formData.endTime}.`,
      });
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        date: new Date(),
        startTime: "",
        endTime: "",
        attendees: "",
        description: "",
        recurring: "none"
      });
    } catch (error) {
      console.error('Error creating/updating booking:', error);
      toast({
        title: existingBooking ? "Update Failed" : "Booking Failed",
        description: `There was an error ${existingBooking ? 'updating' : 'creating'} your booking. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!room) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" aria-describedby="booking-dialog-description">
        <div id="booking-dialog-description" className="sr-only">
          Book a meeting room by filling out the form below with your meeting details.
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            {existingBooking ? 'Edit Booking' : 'Book'} {room.name}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Up to {room.capacity} people</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{room.location}</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              placeholder="Enter meeting title"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => updateFormData({ date: date || new Date() })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Select 
                value={formData.startTime} 
                onValueChange={(value) => {
                  updateFormData({ startTime: value });
                  // Clear end time if it's now before the new start time
                  if (formData.endTime && value >= formData.endTime) {
                    updateFormData({ endTime: "" });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Select 
                value={formData.endTime} 
                onValueChange={(value) => updateFormData({ endTime: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEndTimes().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="attendees">Number of Attendees</Label>
            <Input
              id="attendees"
              type="number"
              placeholder="How many people will attend?"
              value={formData.attendees}
              onChange={(e) => updateFormData({ attendees: e.target.value })}
              max={room.capacity}
            />
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <Label htmlFor="recurring">Recurring Meeting</Label>
            <Select value={formData.recurring} onValueChange={(value) => updateFormData({ recurring: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-time meeting</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Meeting Description</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details about your meeting..."
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Room Amenities */}
          {room.amenities.length > 0 && (
            <div className="space-y-2">
              <Label>Available Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={cn(
                "flex-1 transition-all duration-200",
                isSubmitting && "animate-pulse scale-95"
              )}
              disabled={isSubmitting}
            >
              <Clock className={cn("h-4 w-4 mr-2", isSubmitting && "animate-spin")} />
              {isSubmitting 
                ? (existingBooking ? 'Updating...' : 'Booking...')
                : (existingBooking ? 'Update Booking' : 'Confirm Booking')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}