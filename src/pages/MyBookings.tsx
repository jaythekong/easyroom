import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, ArrowLeft, Edit, Trash2, Eye } from "lucide-react";
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

// Enhanced interface to match what we need, extending the basic booking type
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
    const date = new Date(dateTime.replace('Z', '').replace('+00:00', ''));
    return format(date, 'p');
  };

  console.log('🔍 BookingCard rendering for booking:', booking.id);

  // DEBUGGING: Add mouse event listeners to the entire card
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const card = cardRef.current;
    if (card) {
      const handleCardClick = (e: MouseEvent) => {
        console.log('🎯 CARD CLICKED:', e.target, e.currentTarget);
      };
      const handleCardMouseEnter = () => {
        console.log('🎯 CARD MOUSE ENTER');
      };
      
      card.addEventListener('click', handleCardClick);
      card.addEventListener('mouseenter', handleCardMouseEnter);
      
      return () => {
        card.removeEventListener('click', handleCardClick);
        card.removeEventListener('mouseenter', handleCardMouseEnter);
      };
    }
  }, []);

  // ABSOLUTE SIMPLEST possible structure
  return (
    <div 
      ref={cardRef}
      className="border border-gray-300 bg-white p-4 rounded"
      style={{ 
        position: 'relative',
        zIndex: 1,
        pointerEvents: 'auto'
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{booking.title}</h3>
          <p className="text-sm text-gray-600">
            {booking.room?.name} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            style={{ 
              background: 'blue', 
              color: 'white', 
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              pointerEvents: 'auto',
              zIndex: 10
            }}
            onClick={(e) => {
              console.log('🔵 VIEW BUTTON CLICKED!', e);
              e.stopPropagation();
              onView();
            }}
            onMouseDown={(e) => console.log('🔵 VIEW MOUSEDOWN', e)}
            onMouseEnter={() => console.log('🔵 VIEW MOUSE ENTER')}
          >
            View
          </button>
          
          {canEdit && (
            <button
              type="button"
              style={{ 
                background: 'green', 
                color: 'white', 
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                pointerEvents: 'auto',
                zIndex: 10
              }}
              onClick={(e) => {
                console.log('🟢 EDIT BUTTON CLICKED!', e);
                e.stopPropagation();
                onEdit();
              }}
              onMouseDown={(e) => console.log('🟢 EDIT MOUSEDOWN', e)}
              onMouseEnter={() => console.log('🟢 EDIT MOUSE ENTER')}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const { userRole, organization } = useOrganization();
  const { toast } = useToast();

  // Phase 1: ISOLATED TEST BUTTON - This tests if React events work at all on this page
  const testButtonClick = () => {
    console.log('🎯 ISOLATED TEST BUTTON CLICKED - React events work!');
    alert('Test button works!');
  };
  
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
    console.log('📋 Opening view modal for booking:', booking.id);
    
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
    console.log('✏️ Opening edit modal for booking:', booking.id);
    
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
    console.log('🗑️ Opening delete dialog for booking:', booking.id);
    setSelectedBooking(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBooking) return;
    
    try {
      console.log('🗑️ Deleting booking:', selectedBooking.id);
      
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
        console.error('❌ Failed to send notification:', notificationError);
      }

      toast({
        title: "Booking Deleted",
        description: "The booking has been successfully deleted.",
      });

      setDeleteDialogOpen(false);
      setSelectedBooking(null);
      refetch();
      
    } catch (error) {
      console.error('❌ Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const handleBookingUpdate = () => {
    console.log('🔄 Booking updated, refreshing data');
    refetch();
    // Reset all modal states completely
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
              <h1 className="text-2xl font-bold">My Bookings</h1>
              <p className="text-muted-foreground">Manage your meeting room reservations</p>
            </div>
          </div>
        </div>

        {/* TEMPORARY: Replace Tabs with simple div to test */}
        <div className="w-full" style={{ pointerEvents: 'auto' }}>
          <div className="grid w-full grid-cols-2 mb-8 bg-muted p-1 rounded-md">
            <button 
              className={`px-3 py-1.5 text-sm rounded-sm ${activeTab === 'my-bookings' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setActiveTab('my-bookings')}
            >
              My Bookings
            </button>
            {userRole === 'admin' && (
              <button 
                className={`px-3 py-1.5 text-sm rounded-sm ${activeTab === 'all-bookings' ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setActiveTab('all-bookings')}
              >
                All Bookings
              </button>
            )}
          </div>

          <div style={{ pointerEvents: 'auto' }}>
            {activeTab === 'my-bookings' && <BookingContent />}
            {userRole === 'admin' && activeTab === 'all-bookings' && <BookingContent />}
          </div>
        </div>

        {/* View Modal */}
        <Dialog open={viewModalOpen} onOpenChange={(open) => {
          console.log('📋 View modal state changing:', open);
          setViewModalOpen(open);
          if (!open) {
            setSelectedBooking(null);
            setSelectedRoom(null);
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedBooking.title}</h3>
                  {selectedBooking.description && (
                    <p className="text-muted-foreground">{selectedBooking.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedRoom?.name || 'Room not found'}</span>
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
                    <div>
                      <span>Attendees: {selectedBooking.attendees}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                console.log('📋 Closing view modal via button');
                setViewModalOpen(false);
                setSelectedBooking(null);
                setSelectedRoom(null);
              }}>
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
        {/* CRITICAL TEST: Button directly in BookingContent */}
        <div style={{ background: 'red', padding: '20px', margin: '20px 0' }}>
          <button
            style={{ background: 'white', color: 'black', padding: '15px', border: '2px solid black', fontSize: '16px' }}
            onClick={() => {
              console.log('🔴 BUTTON IN BOOKINGCONTENT CLICKED!');
              alert('BookingContent button works!');
            }}
          >
            TEST IN BOOKINGCONTENT
          </button>
        </div>
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
                  <Calendar className="h-5 w-5 text-blue-600" />
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
            
            {/* DEBUGGING: Test button in the EXACT same area as BookingCard */}
            <div className="mb-4 p-4 border border-red-500 bg-yellow-100">
              <p>DEBUG: Button in same container as BookingCard:</p>
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  console.log('🟣 DEBUG BUTTON IN CARD AREA CLICKED!');
                  alert('Debug button in card area works!');
                }}
              >
                DEBUG BUTTON IN CARD AREA
              </button>
            </div>
            
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id}>
                  {/* DEBUGGING: Simple test button right before BookingCard */}
                  <button
                    className="bg-orange-500 text-white px-2 py-1 rounded text-xs mb-2"
                    onClick={() => {
                      console.log('🟠 BUTTON RIGHT BEFORE BOOKINGCARD CLICKED!');
                      alert('Button before BookingCard works!');
                    }}
                  >
                    TEST BEFORE CARD
                  </button>
                  
                  <BookingCard 
                    booking={booking} 
                    isUpcoming={true}
                    onView={() => handleView(booking)}
                    onEdit={() => handleEdit(booking)}
                    onDelete={() => handleDelete(booking)}
                    canEdit={userRole === 'admin' || booking.user_id === user?.id}
                  />
                  
                  {/* DEBUGGING: Simple test button right after BookingCard */}
                  <button
                    className="bg-pink-500 text-white px-2 py-1 rounded text-xs mt-2"
                    onClick={() => {
                      console.log('🟡 BUTTON RIGHT AFTER BOOKINGCARD CLICKED!');
                      alert('Button after BookingCard works!');
                    }}
                  >
                    TEST AFTER CARD
                  </button>
                </div>
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