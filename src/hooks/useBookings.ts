import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

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
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = format(addDays(selectedDate, 7), 'yyyy-MM-dd');
      
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
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('room_downtime' as any)
        .select('*')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lte('start_time', format(addDays(selectedDate, 7), 'yyyy-MM-dd'));
      
      if (error) throw error;
      return ((data || []) as unknown) as Downtime[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}