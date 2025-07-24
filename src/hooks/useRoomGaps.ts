import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface RoomGap {
  gap_start: string;
  gap_end: string;
}

export function useRoomGaps(roomId: string, date: Date, enabled = true) {
  return useQuery({
    queryKey: ['room-gaps', roomId, format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<RoomGap[]> => {
      const { data, error } = await supabase.rpc('get_room_gaps', {
        p_room_id: roomId,
        p_date: format(date, 'yyyy-MM-dd')
      });

      if (error) {
        console.error('Error fetching room gaps:', error);
        throw error;
      }

      console.log('📅 ROOM GAPS FETCHED:', { roomId, date: format(date, 'yyyy-MM-dd'), gaps: data });
      return data || [];
    },
    enabled: enabled && !!roomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}