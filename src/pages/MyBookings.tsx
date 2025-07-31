import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, ArrowLeft, Edit, Trash2, Eye, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useBookings } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookingWithDetails {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
  organization_id: string;
  description?: string;
  attendees?: number;
  status?: string;
  recurring?: string;
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
  booking: BookingWithDetails;
  isUpcoming: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

function BookingCard({ booking, isUpcoming, onView, onEdit, onDelete, canEdit }: BookingCardProps) {
  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return format(date, 'p');
  };

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return format(date, 'MMM dd, yyyy');
  };

  const getStatusBadge = () => {
    if (!isUpcoming) return <Badge variant="secondary">Past</Badge>;
    
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (now >= startTime && now <= endTime) {
      return <Badge className="bg-success text-success-foreground">In Progress</Badge>;
    }
    
    return <Badge className="bg-warning text-warning-foreground">Upcoming</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{booking.title}</h3>
              {getStatusBadge()}
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{booking.room?.name}</span>
                {booking.room?.location && <span>• {booking.room.location}</span>}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(booking.start_time)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
              </div>
              
              {booking.attendees && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{booking.attendees} attendees</span>
                </div>
              )}
              
              <div>
                <span className="font-medium">Organizer:</span> {booking.user_profiles.display_name || booking.user_profiles.email}
              </div>
            </div>
            
            {booking.description && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {booking.description}
              </p>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
            
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="flex items-center gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("my-bookings");

  // Filter bookings based on user role
  const filteredBookings = activeTab === 'my-bookings' 
    ? allBookings.filter(booking => booking.user_id === user?.id)
    : allBookings;

  const upcomingBookings = filteredBookings.filter(booking => new Date(booking.start_time) > new Date());
  const pastBookings = filteredBookings.filter(booking => new Date(booking.start_time) <= new Date());

  const handleView = async (booking: BookingWithDetails) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_id)
      .maybeSingle();

    setSelectedBooking(booking);
    setSelectedRoom(room);
    setViewModalOpen(true);
  };

  const handleEdit = async (booking: BookingWithDetails) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_id)
      .maybeSingle();

    setSelectedBooking(booking);
    setSelectedRoom(room);
    setEditModalOpen(true);
  };

  const handleDelete = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBooking) return;
    
    try {
      const deleteQuery = supabase
        .from('bookings')
        .delete()
        .eq('id', selectedBooking.id);

      if (userRole !== 'admin') {
        deleteQuery.eq('user_id', user?.id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

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
              bookingId: selectedBooking.id,
              organizationId: profile.organization_id,
              action: 'cancelled'
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Booking Deleted",
        description: "The booking has been successfully deleted.",
      });

      setDeleteDialogOpen(false);
      setSelectedBooking(null);
      refetch();
      
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const handleBookingUpdate = () => {
    refetch();
    setEditModalOpen(false);
    setViewModalOpen(false);
    setDeleteDialogOpen(false);
    setSelectedBooking(null);
    setSelectedRoom(null);
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
              <h1 className="text-2xl font-bold">Booking Management</h1>
              <p className="text-muted-foreground">Track and manage your meeting room reservations</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{upcomingBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Past Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{pastBookings.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab navigation - Simple div structure */}
        <div className="w-full mb-8">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-8">
            <button 
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'my-bookings' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
              onClick={() => setActiveTab('my-bookings')}
            >
              My Bookings
            </button>
            {userRole === 'admin' && (
              <button 
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'all-bookings' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:bg-background/50'
                }`}
                onClick={() => setActiveTab('all-bookings')}
              >
                All Organization Bookings
              </button>
            )}
          </div>

          <div>
            {activeTab === 'my-bookings' && <BookingContent />}
            {userRole === 'admin' && activeTab === 'all-bookings' && <BookingContent />}
          </div>
        </div>

        {/* View Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedBooking.title}</h3>
                  {selectedBooking.description && (
                    <p className="text-muted-foreground mt-2">{selectedBooking.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedRoom?.name || 'Room not found'}</span>
                    {selectedRoom?.location && <span>• {selectedRoom.location}</span>}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(selectedBooking.start_time), 'PPP')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(selectedBooking.start_time), 'p')} - {format(new Date(selectedBooking.end_time), 'p')}
                    </span>
                  </div>
                  
                  {selectedBooking.attendees && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{selectedBooking.attendees} attendees</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium">Organizer:</span> {selectedBooking.user_profiles.display_name || selectedBooking.user_profiles.email}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        {editModalOpen && selectedRoom && selectedBooking && (
          <BookingModal
            room={selectedRoom}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onBookingConfirm={handleBookingUpdate}
            existingBooking={{
              id: selectedBooking.id,
              title: selectedBooking.title,
              description: selectedBooking.description,
              start_time: selectedBooking.start_time,
              end_time: selectedBooking.end_time,
              attendees: selectedBooking.attendees,
              recurring: selectedBooking.recurring || 'none',
              user_profiles: selectedBooking.user_profiles
            }}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this booking? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  function BookingContent() {
    return (
      <>
        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Bookings
            </h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <BookingCard 
                  key={booking.id}
                  booking={booking} 
                  isUpcoming={true}
                  onView={() => handleView(booking)}
                  onEdit={() => handleEdit(booking)}
                  onDelete={() => handleDelete(booking)}
                  canEdit={userRole === 'admin' || booking.user_id === user?.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Past Bookings
            </h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <BookingCard 
                  key={booking.id}
                  booking={booking} 
                  isUpcoming={false}
                  onView={() => handleView(booking)}
                  onEdit={() => handleEdit(booking)}
                  onDelete={() => handleDelete(booking)}
                  canEdit={userRole === 'admin' || booking.user_id === user?.id}
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
                {activeTab === 'my-bookings' 
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