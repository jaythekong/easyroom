import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin, Edit, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
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
    user_profiles?: {
      email: string;
      display_name?: string;
      avatar_url?: string;
    };
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
  const { userRole, organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!booking || !room) return null;

  const isMyBooking = user?.id === booking.user_id;
  const canEditBooking = userRole === 'admin' || isMyBooking;
  
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: organization?.timezone || 'Asia/Phnom_Penh'
    }).format(date);
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: organization?.timezone || 'Asia/Phnom_Penh'
    }).format(date);
  };

  const handleCancelBooking = async () => {
    if (!canEditBooking) return;
    
    setLoading(true);
    try {
      // Security check: only allow canceling own bookings unless admin
      const deleteQuery = supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (userRole !== 'admin') {
        deleteQuery.eq('user_id', user?.id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      // Send Telegram notification for cancellation
      try {
        // Get user's organization ID for notification
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user?.id || '')
          .maybeSingle();

        if (profile?.organization_id) {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              bookingId: booking.id,
              organizationId: profile.organization_id,
              action: 'cancelled'
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to send Telegram notification:', notificationError);
        // Don't block the cancellation if notification fails
      }

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
                <p className="font-medium">
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: organization?.timezone || 'Asia/Phnom_Penh'
                  }).format(new Date(booking.start_time))}
                </p>
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

            {/* Creator info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {booking.user_profiles?.avatar_url ? (
                  <img 
                    src={booking.user_profiles.avatar_url} 
                    alt="Creator avatar" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {(booking.user_profiles?.display_name || booking.user_profiles?.email)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {isMyBooking ? "Your booking" : `Created by ${booking.user_profiles?.display_name || booking.user_profiles?.email || 'Unknown user'}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {canEditBooking ? (isMyBooking ? "You can edit or cancel this booking" : "Admin access - can edit/cancel") : "View-only access"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            
            {canEditBooking && (
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