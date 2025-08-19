import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, ArrowLeft, Edit, Trash2, Eye, Users, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookingModal } from "@/components/BookingModal";
import { BookingDetailsModal } from "@/components/BookingDetailsModal";
import { useQuery } from '@tanstack/react-query';

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
  
  // Custom query to fetch ALL bookings (not just current week)
  const { data: allBookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ['all-bookings', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }

      console.log(`Fetching ALL bookings for org: ${organization.slug}`);
      
      // First fetch all bookings for the organization
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('organization_id', organization.id)
        .order('start_time', { ascending: false });
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      if (!bookingsData || bookingsData.length === 0) {
        console.log(`No bookings found for org ${organization.slug}`);
        return [];
      }

      // Get unique user IDs from the bookings
      const userIds = [...new Set(bookingsData.map(booking => booking.user_id))];
      const roomIds = [...new Set(bookingsData.map(booking => booking.room_id))];
      
      // Fetch user profiles for these users in this organization
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name, avatar_url')
        .eq('organization_id', organization.id)
        .in('user_id', userIds);
      
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Don't throw error, just continue without profile data
      }

      // Fetch room details for these bookings
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, location')
        .eq('organization_id', organization.id)
        .in('id', roomIds);
      
      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
        // Don't throw error, just continue without room data
      }

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.user_id, {
            email: profile.email,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          });
        });
      }

      // Create a map of rooms for quick lookup
      const roomsMap = new Map();
      if (roomsData) {
        roomsData.forEach(room => {
          roomsMap.set(room.id, {
            id: room.id,
            name: room.name,
            location: room.location,
          });
        });
      }

      // Combine bookings with user profile and room data
      const bookingsWithProfiles = bookingsData.map(booking => ({
        ...booking,
        user_profiles: profilesMap.get(booking.user_id) || {
          email: 'Unknown user',
          display_name: null,
          avatar_url: null,
        },
        room: roomsMap.get(booking.room_id) || {
          id: booking.room_id,
          name: `Room ${booking.room_id}`,
          location: null,
        }
      }));
      
      console.log(`Found ${bookingsWithProfiles.length} total bookings for org ${organization.slug}`);
      return bookingsWithProfiles as BookingWithDetails[];
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });
  
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
    setShowViewModal(true); // Always show details first
  };

  const handleEditBooking = async (booking: BookingWithDetails) => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_id)
      .maybeSingle();

    setSelectedBooking(booking);
    setSelectedRoom(room);
    setShowEditModal(true); // Direct to edit modal
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

  const formatTime = (dateTime: string) => {
    // Remove timezone info and treat as local time
    const localDateTime = dateTime.replace(/[+\-]\d{2}:?\d{2}?$|Z$/g, '');
    const date = new Date(localDateTime);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  const formatDate = (dateTime: string) => {
    // Remove timezone info and treat as local time
    const localDateTime = dateTime.replace(/[+\-]\d{2}:?\d{2}?$|Z$/g, '');
    const date = new Date(localDateTime);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit', 
      year: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8 animate-fade-in">
            {/* Header Skeleton */}
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse"></div>
              <div className="h-12 w-96 bg-muted/50 rounded-lg animate-pulse"></div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse"></div>
              ))}
            </div>
            
            {/* Bookings Skeleton */}
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse"></div>
              ))}
            </div>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <Link to={`/${organization?.slug || ''}`}>
              <Button variant="ghost" size="sm" className="hover-scale group">
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Booking Management
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Track and manage your meeting room reservations with comprehensive insights and controls
            </p>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="mb-10 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Filter View</span>
            </div>
            
            <div className="flex bg-muted/50 backdrop-blur-sm rounded-xl p-1.5 border shadow-sm">
              <button
                onClick={() => setViewMode('my')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'my' 
                    ? 'bg-background text-foreground shadow-md scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                My Bookings
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'all' 
                      ? 'bg-background text-foreground shadow-md scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  All Organization Bookings
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="group bg-gradient-to-br from-card to-card/80 border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  {displayBookings.length}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Total Bookings</div>
                <div className="text-xs text-muted-foreground/70">All time records</div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
                  {upcomingBookings.length}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Upcoming</div>
                <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Future reservations</div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/20 dark:to-slate-900/10 border border-slate-200/50 dark:border-slate-800/30 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/30 group-hover:bg-slate-200 dark:group-hover:bg-slate-900/50 transition-colors">
                  <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform">
                  {pastBookings.length}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Past</div>
                <div className="text-xs text-slate-600/70 dark:text-slate-400/70">Completed bookings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming Bookings</h2>
              <div className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
                {upcomingBookings.length}
              </div>
            </div>
            <div className="space-y-4">
              {upcomingBookings.map((booking, index) => (
                <div 
                  key={booking.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <BookingRow 
                    booking={booking}
                    onView={() => handleViewBooking(booking)}
                    onEdit={() => handleEditBooking(booking)}
                    onDelete={() => handleDeleteBooking(booking)}
                    canEdit={userRole === 'admin' || booking.user_id === user?.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="mb-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/30">
                <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Past Bookings</h2>
              <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-sm font-medium">
                {pastBookings.length}
              </div>
            </div>
            <div className="space-y-4">
              {pastBookings.map((booking, index) => (
                <div 
                  key={booking.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <BookingRow 
                    booking={booking}
                    onView={() => handleViewBooking(booking)}
                    onEdit={() => handleEditBooking(booking)}
                    onDelete={() => handleDeleteBooking(booking)}
                    canEdit={userRole === 'admin' || booking.user_id === user?.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Bookings Message */}
        {displayBookings.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="mb-8">
              <div className="p-6 rounded-full bg-muted/50 w-32 h-32 mx-auto flex items-center justify-center mb-6">
                <Calendar className="w-16 h-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No bookings found</h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                {viewMode === 'my' 
                  ? "You haven't made any bookings yet. Start by exploring available meeting rooms."
                  : "No bookings have been made in this organization yet. Be the first to book a room!"
                }
              </p>
            </div>
            
            <Link to={`/${organization?.slug || ''}`}>
              <Button size="lg" className="hover-scale group px-8 py-3">
                <Calendar className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Make Your First Booking
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* View Modal - Using BookingDetailsModal component like calendar */}
      <BookingDetailsModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedBooking(null);
          setSelectedRoom(null);
        }}
        booking={selectedBooking ? {
          ...selectedBooking,
          status: selectedBooking.status || 'confirmed'
        } : null}
        room={selectedRoom}
        onEdit={(booking) => {
          // Close view modal and open edit modal
          setShowViewModal(false);
          handleEditBooking(booking);
        }}
        onBookingUpdate={handleBookingUpdate}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-background border border-border shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="p-4 rounded-full bg-destructive/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Booking</h3>
              <p className="text-muted-foreground">
                Are you sure you want to delete "<span className="font-medium text-foreground">{selectedBooking.title}</span>"? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 hover-scale"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                className="flex-1 hover-scale"
              >
                Delete Booking
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
  const { organization } = useOrganization();
  const formatTime = (dateTime: string) => {
    // Remove timezone info and treat as local time
    const localDateTime = dateTime.replace(/[+\-]\d{2}:?\d{2}?$|Z$/g, '');
    const date = new Date(localDateTime);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  const formatDate = (dateTime: string) => {
    // Remove timezone info and treat as local time
    const localDateTime = dateTime.replace(/[+\-]\d{2}:?\d{2}?$|Z$/g, '');
    const date = new Date(localDateTime);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit', 
      year: 'numeric'
    }).format(date);
  };

  const getStatusBadge = () => {
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (now >= startTime && now <= endTime) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 font-medium px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
          In Progress
        </Badge>
      );
    }
    if (startTime > now) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 font-medium px-3 py-1">
          <Clock className="w-3 h-3 mr-2" />
          Upcoming
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-medium px-3 py-1">
        <Calendar className="w-3 h-3 mr-2" />
        Completed
      </Badge>
    );
  };

  return (
    <div className="group bg-gradient-to-r from-card to-card/95 border border-border/50 rounded-2xl p-6 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-border">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
              {booking.title}
            </h3>
            {getStatusBadge()}
          </div>
          
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="p-2 rounded-lg bg-background">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-foreground">{booking.room?.name}</div>
                {booking.room?.location && (
                  <div className="text-xs text-muted-foreground">{booking.room.location}</div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="p-2 rounded-lg bg-background">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-foreground">{formatDate(booking.start_time)}</div>
                <div className="text-xs text-muted-foreground">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
              </div>
            </div>
            
            {booking.attendees && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="p-2 rounded-lg bg-background">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground">{booking.attendees} Attendees</div>
                  <div className="text-xs text-muted-foreground">Expected guests</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Organizer & Description */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Organizer:</span>
              <span className="text-sm font-medium text-foreground">
                {booking.user_profiles.display_name || booking.user_profiles.email}
              </span>
            </div>
            
            {booking.description && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {booking.description}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[140px]">
          <Button
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 lg:flex-none hover-scale group"
          >
            <Eye className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
            View Details
          </Button>
          
          {canEdit && (
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="flex-1 lg:flex-none border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground hover-scale group"
            >
              <Trash2 className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}