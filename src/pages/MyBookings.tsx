import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, MapPin, Trash2, Edit, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useBookings } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";
import { BookingDetailsModal } from "@/components/BookingDetailsModal";
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
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
  organization_id: string;
  user_profiles: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
  room?: {
    id: string;
    name: string;
    location?: string;
  };
}

interface BookingCardProps {
  booking: Booking;
  isUpcoming: boolean;
  currentUserId?: string;
  userRole?: string;
  onEdit: (booking: Booking) => void;
  onCancel: (bookingId: string) => void;
  onView: (booking: Booking) => void;
}

// Extract BookingCard as a separate component to avoid re-renders
function BookingCard({ 
  booking, 
  isUpcoming, 
  currentUserId, 
  userRole, 
  onEdit, 
  onCancel, 
  onView 
}: BookingCardProps) {
  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime.replace('Z', '').replace('+00:00', ''));
    return format(date, 'p');
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => {
        console.log('👁️ Card clicked - viewing booking:', booking.id);
        onView(booking);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">{booking.title}</h3>
          <Badge variant={isUpcoming ? "default" : "secondary"}>
            {isUpcoming ? 'Upcoming' : 'Past'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{booking.room?.name || `Room ${booking.room_id}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
            </div>
          </div>
          
          {(userRole === 'admin' || booking.user_id !== currentUserId) && booking.user_profiles && (
            <div className="flex items-center gap-2">
              {booking.user_profiles.avatar_url ? (
                <img 
                  src={booking.user_profiles.avatar_url} 
                  alt="Creator avatar" 
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {(booking.user_profiles.display_name || booking.user_profiles.email)?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xs">
                {booking.user_profiles.display_name || booking.user_profiles.email}
              </span>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {format(new Date(booking.start_time), 'PPP')}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const { userRole, organization } = useOrganization();
  const { toast } = useToast();
  
  const { data: allBookings = [], isLoading, error, refetch } = useBookings(new Date());
  
  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedBookingRoom, setSelectedBookingRoom] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<string>("my-bookings");

  // Filter bookings based on user role
  const filteredBookings = activeTab === 'my-bookings' 
    ? allBookings.filter(booking => booking.user_id === user?.id)
    : allBookings;

  const handleCancelBooking = async (bookingId: string) => {
    try {
      console.log('🗑️ Cancelling booking:', bookingId);
      
      // Send Telegram notification
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user?.id || '')
          .maybeSingle();

        if (profile?.organization_id) {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              bookingId: bookingId,
              organizationId: profile.organization_id,
              action: 'cancelled'
            }
          });
        }
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError);
      }

      // Delete booking
      const deleteQuery = supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (userRole !== 'admin') {
        deleteQuery.eq('user_id', user?.id);
      }

      const { error } = await deleteQuery;

      if (error) {
        throw error;
      }

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });

      // Refresh data
      await refetch();
      
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleEditBooking = async (booking: Booking) => {
    try {
      console.log('✏️ Editing booking:', booking.id);
      
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', booking.room_id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching room:', error);
        toast({
          title: "Error",
          description: "Failed to load room details",
          variant: "destructive",
        });
        return;
      }

      if (!room) {
        toast({
          title: "Error", 
          description: "Room not found",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Opening edit modal for booking:', booking.id);
      setEditingBooking(booking);
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
    } catch (error) {
      console.error('❌ Error in handleEditBooking:', error);
      toast({
        title: "Error",
        description: "Failed to open booking editor",
        variant: "destructive",
      });
    }
  };

  const handleViewBooking = async (booking: Booking) => {
    try {
      console.log('👁️ Viewing booking details:', booking.id);
      
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', booking.room_id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching room:', error);
        toast({
          title: "Error",
          description: "Failed to load room details",
          variant: "destructive",
        });
        return;
      }

      if (!room) {
        toast({
          title: "Error", 
          description: "Room not found",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Opening details modal for booking:', booking.id);
      setSelectedBooking(booking);
      setSelectedBookingRoom(room);
      setIsBookingDetailsOpen(true);
    } catch (error) {
      console.error('❌ Error in handleViewBooking:', error);
      toast({
        title: "Error",
        description: "Failed to open booking details",
        variant: "destructive",
      });
    }
  };

  const handleBookingUpdate = () => {
    console.log('🔄 Refreshing bookings after update');
    refetch();
    setIsBookingModalOpen(false);
    setEditingBooking(null);
    setSelectedRoom(null);
  };

  const handleDetailsModalEdit = (booking: any) => {
    console.log('✏️ Edit requested from details modal:', booking.id);
    // Close details modal
    setIsBookingDetailsOpen(false);
    setSelectedBooking(null);
    setSelectedBookingRoom(null);
    // Open edit modal
    handleEditBooking(booking);
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  // Filter bookings
  const upcomingBookings = filteredBookings.filter(booking => isUpcoming(booking.start_time));
  const pastBookings = filteredBookings.filter(booking => !isUpcoming(booking.start_time));

  const getTabTitle = () => {
    return activeTab === 'my-bookings' ? 'My Bookings' : 'All Bookings';
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Error loading bookings</h2>
            <p className="text-muted-foreground mb-4">Failed to fetch your bookings</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={`/${organization?.slug || ''}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Bookings</h1>
              <p className="text-muted-foreground">Manage your meeting room reservations</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="all-bookings">All Bookings</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-bookings">
            <BookingContent />
          </TabsContent>
          
          {userRole === 'admin' && (
            <TabsContent value="all-bookings">
              <BookingContent />
            </TabsContent>
          )}
        </Tabs>

        {/* Modals */}
        {isBookingModalOpen && selectedRoom && (
          <BookingModal
            room={selectedRoom}
            isOpen={isBookingModalOpen}
            onClose={() => {
              console.log('🔒 Closing booking modal');
              setIsBookingModalOpen(false);
              setEditingBooking(null);
              setSelectedRoom(null);
            }}
            onBookingConfirm={handleBookingUpdate}
            existingBooking={editingBooking}
          />
        )}

        <BookingDetailsModal
          booking={selectedBooking}
          room={selectedBookingRoom}
          isOpen={isBookingDetailsOpen}
          onClose={() => {
            console.log('🔒 Closing details modal');
            setIsBookingDetailsOpen(false);
            setSelectedBooking(null);
            setSelectedBookingRoom(null);
          }}
          onEdit={handleDetailsModalEdit}
          onBookingUpdate={handleBookingUpdate}
        />
      </div>
    </div>
  );

  function BookingContent() {
    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredBookings.length}</p>
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
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  isUpcoming={true}
                  currentUserId={user?.id}
                  userRole={userRole}
                  onEdit={handleEditBooking}
                  onCancel={handleCancelBooking}
                  onView={handleViewBooking}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Past Bookings</h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  isUpcoming={false}
                  currentUserId={user?.id}
                  userRole={userRole}
                  onEdit={handleEditBooking}
                  onCancel={handleCancelBooking}
                  onView={handleViewBooking}
                />
              ))}
            </div>
          </div>
        )}

        {/* No bookings message */}
        {filteredBookings.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-4">
                {getTabTitle() === 'My Bookings' 
                  ? "You haven't made any bookings yet."
                  : "No bookings have been made in this organization yet."
                }
              </p>
              <Link to={`/${organization?.slug || ''}`}>
                <Button>Make a Booking</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </>
    );
  }
}