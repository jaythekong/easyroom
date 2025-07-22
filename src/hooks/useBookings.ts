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
      
      // Format dates with time to ensure proper comparison with timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00.000Z'; // Add 1 day to include all of Sunday
      
      console.log(`Fetching bookings from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')} for org: ${organization.slug}`);
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
        .eq('organization_id', organization.id)
        .gte('start_time', startDateTime)
        .lt('start_time', endDateTime);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} bookings in date range for org ${organization.slug}`);
      return data as Booking[];
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
      
      // Format dates with time to ensure proper comparison with timestamps
      const startDateTime = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const endDateTime = format(addDays(weekEnd, 1), 'yyyy-MM-dd') + 'T00:00:00.000Z'; // Add 1 day to include all of Sunday
      
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