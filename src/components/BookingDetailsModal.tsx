import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin, Edit, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    attendees?: number;
    status: string;
    recurring: string;
    user_id: string;
  } | null;
  room: {
    id: string;
    name: string;
    location?: string;
    capacity: number;
  } | null;
  onEdit?: (booking: any) => void;
  onBookingUpdate?: () => void;
}

export function BookingDetailsModal({ 
  isOpen, 
  onClose, 
  booking, 
  room, 
  onEdit,
  onBookingUpdate 
}: BookingDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!booking || !room) return null;

  const isMyBooking = user?.id === booking.user_id;
  
  const formatDateTime = (dateTime: string) => {
    // Treat the stored time as local time, not UTC
    const date = new Date(dateTime.replace('Z', '').replace('+00:00', ''));
    return format(date, 'PPP p');
  };

  const formatTime = (dateTime: string) => {
    // Treat the stored time as local time, not UTC
    const date = new Date(dateTime.replace('Z', '').replace('+00:00', ''));
    return format(date, 'p');
  };

  const handleCancelBooking = async () => {
    if (!isMyBooking) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id)
        .eq('user_id', user?.id); // Extra security check

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });

      onBookingUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    onEdit?.(booking);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="booking-details-description">
        <div id="booking-details-description" className="sr-only">
          View booking details and manage your reservation.
        </div>
        
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Booking Title and Status */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{booking.title}</h3>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
              {booking.recurring !== 'none' && (
                <Badge variant="outline">
                  {booking.recurring}
                </Badge>
              )}
            </div>
            {booking.description && (
              <p className="text-sm text-muted-foreground">
                {booking.description}
              </p>
            )}
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{room.name}</p>
                {room.location && (
                  <p className="text-xs text-muted-foreground">{room.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{format(new Date(booking.start_time), 'PPPP')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
              </div>
            </div>

            {booking.attendees && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.attendees} attendees</p>
                  <p className="text-xs text-muted-foreground">
                    Room capacity: {room.capacity} people
                  </p>
                </div>
              </div>
            )}

            {/* Ownership indicator */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isMyBooking ? "Your booking" : "Someone else's booking"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isMyBooking ? "You can edit or cancel this booking" : "View-only access"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            
            {isMyBooking && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleCancelBooking}
                  disabled={loading}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {loading ? "Cancelling..." : "Cancel"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}