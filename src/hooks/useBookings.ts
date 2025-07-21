import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek } from "date-fns";

interface Booking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
  user_profiles: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export function useBookings(selectedDate: Date) {
  return useQuery({
    queryKey: ['bookings', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Calculate the full week range around the selected date
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      // Format dates with time to ensure proper comparison with timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00.000Z'; // Add 1 day to include all of Sunday
      
      console.log(`Fetching bookings from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')} for selected date:`, format(selectedDate, 'yyyy-MM-dd'));
      console.log('Query range:', { startDateTime, endDateTime });
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user_profiles!bookings_user_id_fkey (
            email,
            display_name,
            avatar_url
          )
        `)
        .gte('start_time', startDateTime)
        .lt('start_time', endDateTime);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} bookings in date range`);
      return data as Booking[];
    },
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
}

export function useDowntime(selectedDate: Date) {
  return useQuery({
    queryKey: ['downtime', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Calculate the full week range around the selected date  
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      // Format dates with time to ensure proper comparison with timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00.000Z'; // Add 1 day to include all of Sunday
      
      console.log(`Fetching downtime from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')} for selected date:`, format(selectedDate, 'yyyy-MM-dd'));
      
      const { data, error } = await supabase
        .from('room_downtime' as any)
        .select('*')
        .gte('start_time', startDateTime)
        .lt('start_time', endDateTime);
      
      if (error) throw error;
      return ((data || []) as unknown) as Downtime[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}