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
  };
}

export function useBookings(selectedDate: Date) {
  return useQuery({
    queryKey: ['bookings', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Calculate the full week range around the selected date
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      
      console.log(`Fetching bookings from ${startDate} to ${endDate} for selected date:`, format(selectedDate, 'yyyy-MM-dd'));
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user_profiles!bookings_user_id_fkey (
            email
          )
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate);
      
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
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      
      console.log(`Fetching downtime from ${startDate} to ${endDate} for selected date:`, format(selectedDate, 'yyyy-MM-dd'));
      
      const { data, error } = await supabase
        .from('room_downtime' as any)
        .select('*')
        .gte('start_time', startDate)
        .lte('start_time', endDate);
      
      if (error) throw error;
      return ((data || []) as unknown) as Downtime[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}