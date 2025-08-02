import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, ArrowLeft, Edit, Trash2, Eye, Users, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useBookings } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";

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

export default function MyBookings() {
  const { user } = useAuth();
  const { userRole, organization } = useOrganization();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: allBookings = [], isLoading, error, refetch } = useBookings(new Date());
  
  // Filter bookings based on view mode
  const displayBookings = viewMode === 'my' 
    ? allBookings.filter(booking => booking.user_id === user?.id)
    : allBookings;

  const upcomingBookings = displayBookings.filter(booking => new Date(booking.start_time) > new Date());
  const pastBookings = displayBookings.filter(booking => new Date(booking.start_time) <= new Date());

  const handleViewBooking = async (booking: BookingWithDetails) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_id)
      .maybeSingle();

    setSelectedBooking(booking);
    setSelectedRoom(room);
    setShowViewModal(true);
  };

  const handleEditBooking = async (booking: BookingWithDetails) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_id)
      .maybeSingle();

    setSelectedBooking(booking);
    setSelectedRoom(room);
    setShowEditModal(true);
  };

  const handleDeleteBooking = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setShowDeleteConfirm(true);
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

      toast({
        title: "Booking Deleted",
        description: "The booking has been successfully deleted.",
      });

      setShowDeleteConfirm(false);
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
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedBooking(null);
    setSelectedRoom(null);
  };

  const getBookingStatus = (booking: BookingWithDetails) => {
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (now >= startTime && now <= endTime) return 'active';
    if (startTime > now) return 'upcoming';
    return 'past';
  };

  const formatTime = (dateTime: string) => format(new Date(dateTime), 'p');
  const formatDate = (dateTime: string) => format(new Date(dateTime), 'MMM dd, yyyy');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading bookings</h2>
          <p className="text-muted-foreground mb-4">Failed to fetch bookings</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to={`/${organization?.slug || ''}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Booking Management</h1>
          <p className="text-muted-foreground">Track and manage your meeting room reservations</p>
        </div>

        {/* View Mode Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('my')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'my' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Bookings
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'all' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Organization Bookings
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-card border rounded-lg p-6">
              <div className="text-2xl font-bold">{displayBookings.length}</div>
              <div className="text-sm text-muted-foreground">Total Bookings</div>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="text-2xl font-bold text-amber-600">{upcomingBookings.length}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="text-2xl font-bold text-muted-foreground">{pastBookings.length}</div>
              <div className="text-sm text-muted-foreground">Past</div>
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming Bookings
            </h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <BookingRow 
                  key={booking.id}
                  booking={booking}
                  onView={() => handleViewBooking(booking)}
                  onEdit={() => handleEditBooking(booking)}
                  onDelete={() => handleDeleteBooking(booking)}
                  canEdit={userRole === 'admin' || booking.user_id === user?.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Past Bookings
            </h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <BookingRow 
                  key={booking.id}
                  booking={booking}
                  onView={() => handleViewBooking(booking)}
                  onEdit={() => handleEditBooking(booking)}
                  onDelete={() => handleDeleteBooking(booking)}
                  canEdit={userRole === 'admin' || booking.user_id === user?.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Bookings Message */}
        {displayBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground mb-4">
              {viewMode === 'my' 
                ? "You haven't made any bookings yet."
                : "No bookings have been made in this organization yet."
              }
            </p>
            <Link to={`/${organization?.slug || ''}`}>
              <Button>Make a Booking</Button>
            </Link>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
            <div className="space-y-3">
              <div>
                <div className="font-medium">{selectedBooking.title}</div>
                {selectedBooking.description && (
                  <div className="text-sm text-muted-foreground mt-1">{selectedBooking.description}</div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedRoom?.name}</span>
                  {selectedRoom?.location && <span>• {selectedRoom.location}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(selectedBooking.start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</span>
                </div>
                {selectedBooking.attendees && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{selectedBooking.attendees} attendees</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Organizer:</span> {selectedBooking.user_profiles.display_name || selectedBooking.user_profiles.email}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Booking</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRoom && selectedBooking && (
        <BookingModal
          room={selectedRoom}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
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
    </div>
  );
}

// Separate BookingRow component for cleaner structure
function BookingRow({ 
  booking, 
  onView, 
  onEdit, 
  onDelete, 
  canEdit 
}: {
  booking: BookingWithDetails;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const formatTime = (dateTime: string) => format(new Date(dateTime), 'p');
  const formatDate = (dateTime: string) => format(new Date(dateTime), 'MMM dd, yyyy');

  const getStatusBadge = () => {
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (now >= startTime && now <= endTime) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">In Progress</Badge>;
    }
    if (startTime > now) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Upcoming</Badge>;
    }
    return <Badge variant="secondary">Past</Badge>;
  };

  return (
    <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-semibold text-lg">{booking.title}</h3>
            {getStatusBadge()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{booking.room?.name}</span>
              {booking.room?.location && <span>• {booking.room.location}</span>}
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(booking.start_time)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
            </div>
            
            {booking.attendees && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>{booking.attendees} attendees</span>
              </div>
            )}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Organizer:</span> {booking.user_profiles.display_name || booking.user_profiles.email}
          </div>
          
          {booking.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {booking.description}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 ml-6">
          <button
            onClick={onView}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}