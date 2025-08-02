import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";

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

export function useBookings(selectedDate: Date) {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['bookings', format(selectedDate, 'yyyy-MM-dd'), organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }

      // Calculate the full week range around the selected date
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      // Format dates as local times for comparison with stored timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00'; // Add 1 day to include all of Sunday
      
      console.log(`Fetching bookings from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')} for org: ${organization.slug}`);
      console.log('Query range:', { startDateTime, endDateTime });
      
      // First fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('start_time', startDateTime)
        .lt('start_time', endDateTime);
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      if (!bookingsData || bookingsData.length === 0) {
        console.log(`No bookings found in date range for org ${organization.slug}`);
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
      
      console.log(`Found ${bookingsWithProfiles.length} bookings in date range for org ${organization.slug}`);
      return bookingsWithProfiles as Booking[];
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

interface Downtime {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  room_id: string;
  downtime_type: string;
  organization_id: string;
}

export function useDowntime(selectedDate: Date) {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime', format(selectedDate, 'yyyy-MM-dd'), organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }

      // Calculate the full week range around the selected date  
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      // Format dates as local times for comparison with stored timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00'; // Add 1 day to include all of Sunday
      
      console.log(`Fetching downtime from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')} for org: ${organization.slug}`);
      
      const { data, error } = await supabase
        .from('room_downtime' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .gte('start_time', startDateTime)
        .lt('start_time', endDateTime);
      
      if (error) throw error;
      return ((data || []) as unknown) as Downtime[];
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}
