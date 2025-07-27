import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Users, MapPin, AlertCircle, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { logger } from "@/lib/logger";
import { 
  sanitizeInput, 
  bookingTitleSchema, 
  bookingDescriptionSchema, 
  attendeesSchema 
} from "@/lib/validation";
import { useRoomGaps } from "@/hooks/useRoomGaps";
import { useMemo } from "react";

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
    user_profiles?: {
      email: string;
      display_name?: string;
      avatar_url?: string;
    };
  } | null;
}

// Generate all possible time slots (30-minute intervals)
const generateAllTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break; // Stop at 22:00
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

const allTimeSlots = generateAllTimeSlots();

export function BookingModal({ isOpen, onClose, room, onBookingConfirm, initialDate, initialStartTime, existingBooking }: BookingModalProps) {
  console.log('📱 BookingModal render:', { isOpen, room: room?.name, existingBooking: !!existingBooking });
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [timeConflictError, setTimeConflictError] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    date: initialDate || new Date(),
    startTime: initialStartTime || "",
    endTime: "",
    attendees: "",
    description: "",
    recurring: "none"
  });

  // Fetch room gaps for smart time selection
  const { data: roomGaps = [], isLoading: isLoadingGaps } = useRoomGaps(
    room?.id || '',
    formData.date,
    isOpen && !!room
  );

  // Helper function to check if a time falls within any gap
  const timeInGaps = (timeStr: string) => {
    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const timeToCheck = new Date(`${dateStr}T${timeStr}:00.000Z`);
    
    return roomGaps.some(gap => {
      const gapStart = new Date(gap.gap_start);
      const gapEnd = new Date(gap.gap_end);
      return timeToCheck >= gapStart && timeToCheck < gapEnd;
    });
  };

  // Get available start times (only times that fall within gaps)
  const availableStartTimes = useMemo(() => {
    if (!roomGaps.length) return [];
    return allTimeSlots.filter(timeInGaps);
  }, [roomGaps, formData.date]);

  // Get available end times (only times within the same gap as start time)
  const availableEndTimes = useMemo(() => {
    if (!formData.startTime || !roomGaps.length) return [];
    
    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const startTime = new Date(`${dateStr}T${formData.startTime}:00.000Z`);
    
    // Find the gap that contains the start time
    const currentGap = roomGaps.find(gap => {
      const gapStart = new Date(gap.gap_start);
      const gapEnd = new Date(gap.gap_end);
      return startTime >= gapStart && startTime < gapEnd;
    });
    
    if (!currentGap) return [];
    
    // Return all times after start time but within the same gap
    return allTimeSlots.filter(timeStr => {
      const time = new Date(`${dateStr}T${timeStr}:00.000Z`);
      const gapEnd = new Date(currentGap.gap_end);
      return time > startTime && time <= gapEnd;
    });
  }, [formData.startTime, roomGaps, formData.date]);

  // Update form data when initial props change
  const updateFormData = (updates: Partial<typeof formData>) => {
    console.log('📝 updateFormData called with:', updates);
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      console.log('📝 New form data:', newData);
      return newData;
    });
  };

  // Fetch existing bookings when modal opens or date/room changes
  useEffect(() => {
    const fetchExistingBookings = async () => {
      if (!isOpen || !room || !organization?.id) {
        console.log('📝 SKIPPING FETCH - Missing requirements:', { isOpen, room: !!room, org: !!organization?.id });
        return;
      }

      const dateStr = format(formData.date, 'yyyy-MM-dd');
      console.log('📝 FETCHING EXISTING BOOKINGS:', { 
        roomId: room.id, 
        orgId: organization.id, 
        date: dateStr,
        excludeBookingId: existingBooking?.id 
      });

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', room.id)
        .eq('organization_id', organization.id)
        .gte('start_time', `${dateStr}T00:00:00.000Z`)
        .lt('start_time', `${dateStr}T23:59:59.999Z`)
        .neq('id', existingBooking?.id || 'none'); // Exclude current booking if editing

      if (error) {
        console.error('📝 ERROR FETCHING BOOKINGS:', error);
        setExistingBookings([]);
      } else {
        console.log('📝 FETCHED EXISTING BOOKINGS:', data?.length || 0, 'bookings found', data);
        setExistingBookings(data || []);
      }
    };

    fetchExistingBookings();
  }, [isOpen, room?.id, formData.date, organization?.id, existingBooking?.id]);

  // Check for time conflicts
  const checkTimeConflict = (startTime: string, endTime: string) => {
    if (!startTime || !endTime || !formData.date) return false;

    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const checkStart = new Date(`${dateStr}T${startTime}:00`);
    const checkEnd = new Date(`${dateStr}T${endTime}:00`);

    console.log('📝 CHECKING CONFLICT:', {
      checkStart: checkStart.toISOString(),
      checkEnd: checkEnd.toISOString(),
      existingBookingsCount: existingBookings.length,
      existingBookings: existingBookings.map(b => ({
        title: b.title,
        start: b.start_time,
        end: b.end_time
      }))
    });

    const hasConflict = existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // Check if times overlap
      const overlaps = checkStart < bookingEnd && checkEnd > bookingStart;
      
      if (overlaps) {
        console.log('📝 CONFLICT DETECTED:', {
          newBooking: `${checkStart.toISOString()} - ${checkEnd.toISOString()}`,
          existingBooking: `${bookingStart.toISOString()} - ${bookingEnd.toISOString()}`,
          title: booking.title
        });
      }
      
      return overlaps;
    });

    console.log('📝 CONFLICT RESULT:', hasConflict);
    return hasConflict;
  };

  // Check if a specific time slot has conflicts
  const isTimeSlotConflicted = (time: string, isEndTime = false) => {
    if (!time || !formData.date) return false;

    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const slotTime = new Date(`${dateStr}T${time}:00`);

    return existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      if (isEndTime) {
        // For end time, check if the slot falls within an existing booking
        return slotTime > bookingStart && slotTime <= bookingEnd;
      } else {
        // For start time, check if the slot falls within an existing booking
        return slotTime >= bookingStart && slotTime < bookingEnd;
      }
    });
  };

  // Get conflicting booking details for tooltip
  const getConflictingBooking = (time: string) => {
    if (!time || !formData.date) return null;

    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const slotTime = new Date(`${dateStr}T${time}:00`);

    return existingBookings.find(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotTime >= bookingStart && slotTime < bookingEnd;
    });
  };

  // Reset form data when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      console.log('📝 BookingModal opened with data:', {
        existingBooking: !!existingBooking,
        initialDate,
        initialStartTime,
        room: room?.name,
        currentTitle: formData.title
      });

      // Only reset form if it's currently empty or if we have an existing booking to load
      const shouldResetForm = !formData.title || existingBooking;
      
      if (shouldResetForm) {
        if (existingBooking) {
          // Pre-fill form with existing booking data
          // Parse the UTC times and convert to local date but keep the time in the intended timezone
          const startDate = new Date(existingBooking.start_time);
          const endDate = new Date(existingBooking.end_time);
          
          // Create new date objects for the same calendar date but with corrected times
          const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          
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

          // Extract time components from the original UTC times
          const startUTC = new Date(existingBooking.start_time);
          const endUTC = new Date(existingBooking.end_time);
          const formattedStartTime = startUTC.toISOString().substring(11, 16); // HH:mm format from UTC
          const formattedEndTime = endUTC.toISOString().substring(11, 16); // HH:mm format from UTC
          
          console.log('📝 Time formatting:', {
            originalStartTime: existingBooking.start_time,
            originalEndTime: existingBooking.end_time,
            startUTC: startUTC.toISOString(),
            endUTC: endUTC.toISOString(),
            formattedStartTime,
            formattedEndTime,
            availableTimeSlots: allTimeSlots,
            startTimeInSlots: allTimeSlots.includes(formattedStartTime),
            endTimeInSlots: allTimeSlots.includes(formattedEndTime)
          });

          const newFormData = {
            title: existingBooking.title || "",
            date: localStartDate,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
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
      } else {
        console.log('📝 Skipping form reset - user has already started typing');
      }
      
      // Clear any previous conflict errors
      setTimeConflictError("");
    }
  }, [isOpen, existingBooking?.id, initialDate, initialStartTime]); // More specific dependencies

  // Validate start time for conflicts
  useEffect(() => {
    if (formData.startTime && formData.date) {
      if (isTimeSlotConflicted(formData.startTime)) {
        setTimeConflictError("Start overlaps an existing booking.");
      } else if (formData.endTime && checkTimeConflict(formData.startTime, formData.endTime)) {
        setTimeConflictError("Time range conflicts with existing booking.");
      } else {
        setTimeConflictError("");
      }
    }
  }, [formData.startTime, formData.endTime, formData.date, existingBookings]);

  // Legacy function for backward compatibility with existing booking edits
  const getAvailableEndTimes = () => {
    // For existing bookings, use the legacy logic to ensure original times are preserved
    if (existingBooking) {
      if (!formData.startTime) return allTimeSlots;
      
      const startIndex = allTimeSlots.findIndex(time => time === formData.startTime);
      const availableTimes = allTimeSlots.slice(startIndex + 1);
      
      // When editing an existing booking, ensure the original end time is always available
      if (formData.endTime && !availableTimes.includes(formData.endTime)) {
        const allTimes = [...availableTimes, formData.endTime].sort((a, b) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });
        return allTimes;
      }
      
      return availableTimes;
    }
    
    // For new bookings, use the gap-based available end times
    return availableEndTimes;
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

    // Check for time conflicts before submitting
    if (checkTimeConflict(formData.startTime, formData.endTime)) {
      console.log("📝 SUBMISSION BLOCKED - Time conflict detected");
      toast({
        title: "Time Conflict",
        description: "The selected time overlaps with an existing booking. Please choose a different time.",
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
      
      logger.debug("DateTime strings:", { startDateTime, endDateTime });

      // Check if organization is available
      if (!organization?.id) {
        throw new Error('No organization selected. Please contact admin.');
      }

      let bookingData: any = {
        room_id: room.id,
        title: formData.title,
        description: formData.description,
        start_time: startDateTime,
        end_time: endDateTime,
        attendees: parseInt(formData.attendees) || 1,
        recurring: formData.recurring,
        organization_id: organization.id
      };

      // For new bookings, set the current user as the owner
      // For updates, we don't change the user_id - keep original owner
      if (!existingBooking) {
        bookingData.user_id = user.id;
      }

      console.log("About to create/update booking with:", bookingData);

      let booking, error;

      if (existingBooking) {
        // Update existing booking
        console.log("📝 UPDATING EXISTING BOOKING:", {
          bookingId: existingBooking.id,
          updateData: bookingData,
          user: user?.id,
          room: room.id
        });
        
        const { data, error: updateError } = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('id', existingBooking.id)
          .select()
          .single();
          
        console.log("📝 UPDATE RESULT:", { data, error: updateError });
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

      // Send Telegram notification
      try {
        if (booking?.id) {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              bookingId: booking.id,
              organizationId: organization.id,
              action: existingBooking ? 'updated' : 'created'
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to send Telegram notification:', notificationError);
        // Don't block the booking success if notification fails
      }

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
      console.error('📝 BOOKING ERROR DETAILS:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        bookingData: formData,
        existingBooking: existingBooking?.id,
        user: user?.id
      });
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
          {existingBooking?.user_profiles && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2">
                {existingBooking.user_profiles.avatar_url ? (
                  <img 
                    src={existingBooking.user_profiles.avatar_url} 
                    alt="Creator avatar" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {(existingBooking.user_profiles.display_name || existingBooking.user_profiles.email)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span>
                  Created by: <strong>
                    {existingBooking.user_profiles.display_name || existingBooking.user_profiles.email}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              placeholder="Enter meeting title"
              value={formData.title}
              onChange={(e) => {
                console.log('📝 Title input change:', e.target.value);
                updateFormData({ title: e.target.value });
              }}
              onFocus={() => console.log('📝 Title input focused')}
              onBlur={() => console.log('📝 Title input blurred')}
              required
              autoComplete="off"
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

            {/* Room fully booked banner */}
            {!isLoadingGaps && !existingBooking && availableStartTimes.length === 0 && (
              <div className="col-span-full mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">Room fully booked on this date</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Select 
                value={formData.startTime} 
                onValueChange={(value) => {
                  updateFormData({ startTime: value });
                  // Clear end time when start time changes
                  if (formData.endTime) {
                    updateFormData({ endTime: "" });
                  }
                }}
                disabled={isLoadingGaps}
              >
                <SelectTrigger className={cn(timeConflictError && "border-destructive")}>
                  <SelectValue placeholder={isLoadingGaps ? "Loading..." : "Start time"} />
                </SelectTrigger>
                <SelectContent>
                  <TooltipProvider>
                    {(existingBooking ? allTimeSlots : availableStartTimes).map((time) => {
                      const isAvailable = existingBooking || availableStartTimes.includes(time);
                      const isConflicted = existingBooking ? isTimeSlotConflicted(time) : false;
                      const conflictingBooking = getConflictingBooking(time);
                      
                      if (!existingBooking && !isAvailable) {
                        return (
                          <Tooltip key={time}>
                            <TooltipTrigger asChild>
                              <SelectItem 
                                value={time} 
                                disabled
                                className="text-muted-foreground opacity-40 cursor-not-allowed"
                              >
                                {time}
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Time overlaps an existing booking</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      if (existingBooking && isConflicted && conflictingBooking) {
                        return (
                          <Tooltip key={time}>
                            <TooltipTrigger asChild>
                              <SelectItem 
                                value={time} 
                                disabled
                                className="text-muted-foreground opacity-40 cursor-not-allowed"
                              >
                                {time}
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Conflicts with existing booking: {conflictingBooking.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      
                      return (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      );
                    })}
                  </TooltipProvider>
                </SelectContent>
              </Select>
              {timeConflictError && (
                <div className="flex items-center gap-1 text-destructive text-sm">
                  <AlertCircle className="h-3 w-3" />
                  <span>{timeConflictError}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Select 
                value={formData.endTime} 
                onValueChange={(value) => updateFormData({ endTime: value })}
                disabled={isLoadingGaps || !formData.startTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.startTime 
                      ? "Select start time first" 
                      : isLoadingGaps 
                      ? "Loading..." 
                      : "End time"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <TooltipProvider>
                    {getAvailableEndTimes().map((time) => {
                      const isConflicted = existingBooking ? isTimeSlotConflicted(time, true) : false;
                      const conflictingBooking = getConflictingBooking(time);
                      
                      if (existingBooking && isConflicted && conflictingBooking) {
                        return (
                          <Tooltip key={time}>
                            <TooltipTrigger asChild>
                              <SelectItem 
                                value={time} 
                                disabled
                                className="text-muted-foreground opacity-40 cursor-not-allowed"
                              >
                                {time}
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Conflicts with existing booking: {conflictingBooking.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      
                      return (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      );
                    })}
                  </TooltipProvider>
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
              disabled={isSubmitting || !!timeConflictError}
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