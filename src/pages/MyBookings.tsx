import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin, Trash2, Edit, ArrowLeft, Check, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Booking {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendees?: number;
  status: string;
  recurring: string;
  created_at: string;
  room: {
    id: string;
    name: string;
    location?: string;
    capacity: number;
    amenities: string[];
  };
}

export default function MyBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [confirmingBookings, setConfirmingBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchMyBookings();
    }
  }, [user]);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user_profiles!bookings_user_id_fkey (
            email
          ),
          rooms (
            id,
            name,
            location,
            capacity,
            room_amenities (
              amenities (
                name
              )
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const formattedBookings = data?.map(booking => ({
        ...booking,
        room: {
          ...booking.rooms,
          amenities: booking.rooms?.room_amenities?.map(ra => ra.amenities.name) || []
        }
      })) || [];

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      console.log('Cancelling booking:', bookingId);
      
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('user_id', user?.id); // Extra security check

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Booking deleted successfully, refreshing list...');

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });

      // Await the refresh to ensure it completes
      await fetchMyBookings();
      console.log('Bookings list refreshed successfully');
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedRoom(booking.room);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    // Prevent multiple submissions for the same booking
    if (confirmingBookings.has(bookingId)) return;
    
    setConfirmingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Booking Confirmed",
        description: "Your booking has been confirmed.",
      });

      fetchMyBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: "Error",
        description: "Failed to confirm booking",
        variant: "destructive",
      });
    } finally {
      setConfirmingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleBookingUpdate = () => {
    fetchMyBookings(); // Refresh the bookings list
    setIsBookingModalOpen(false);
    setEditingBooking(null);
    setSelectedRoom(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const upcomingBookings = bookings.filter(booking => isUpcoming(booking.start_time));
  const pastBookings = bookings.filter(booking => !isUpcoming(booking.start_time));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="../">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">My Bookings</h1>
                <p className="text-sm text-muted-foreground">Manage your meeting room reservations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingBookings.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pastBookings.length}</p>
                  <p className="text-sm text-muted-foreground">Past Meetings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Upcoming Bookings</h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{booking.title}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          {booking.recurring !== 'none' && (
                            <Badge variant="outline">
                              {booking.recurring}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{booking.room.name}</span>
                            {booking.room.location && (
                              <span>• {booking.room.location}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(booking.start_time), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                          </div>
                          {booking.attendees && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{booking.attendees} attendees</span>
                            </div>
                          )}
                        </div>

                        {booking.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {booking.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* Only show edit/cancel for future bookings */}
                        {isUpcoming(booking.start_time) && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditBooking(booking)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            
                            {/* Show confirm button for pending bookings */}
                            {booking.status === 'pending' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleConfirmBooking(booking.id)}
                                className={cn(
                                  "bg-green-600 hover:bg-green-700 transition-all duration-200",
                                  confirmingBookings.has(booking.id) && "animate-pulse scale-95"
                                )}
                                disabled={confirmingBookings.has(booking.id)}
                              >
                                <Check className={cn(
                                  "h-4 w-4 mr-2",
                                  confirmingBookings.has(booking.id) && "animate-spin"
                                )} />
                                {confirmingBookings.has(booking.id) ? 'Confirming...' : 'Confirm'}
                              </Button>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel your booking for "{booking.title}" 
                                    at {booking.room?.name} on {format(new Date(booking.start_time), "PPP")}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelBooking(booking.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Yes, Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        
                        {/* For past bookings, show read-only status */}
                        {!isUpcoming(booking.start_time) && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Past Bookings</h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{booking.title}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{booking.room.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(booking.start_time), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't made any room reservations. Start by booking a meeting room!
            </p>
            <Button asChild>
              <Link to="/">
                Browse Rooms
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onBookingConfirm={handleBookingUpdate}
        existingBooking={editingBooking}
      />
    </div>
  );
}