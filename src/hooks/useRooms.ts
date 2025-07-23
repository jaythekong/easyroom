
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
  photo_url: string;
  status: 'active' | 'inactive';
  created_at: string;
  organization_id: string;
  amenities?: string[];
}

export function useRooms() {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['rooms', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log('🏠 useRooms: No organization ID, returning empty array');
        return [];
      }

      console.log('🏠 useRooms: Fetching rooms for organization:', organization.id, organization.name);

      const { data, error } = await supabase
        .from("rooms")
        .select(`
          *,
          room_amenities (
            amenities (
              name
            )
          )
        `)
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('🏠 useRooms: Error fetching rooms:', error);
        throw error;
      }
      
      console.log('🏠 useRooms: Raw rooms data:', data);
      
      // Format rooms with amenities
      const formattedRooms = (data || []).map(room => ({
        ...room,
        amenities: room.room_amenities?.map((ra: any) => ra.amenities.name) || []
      }));
      
      console.log('🏠 useRooms: Formatted rooms:', formattedRooms);
      
      return formattedRooms as Room[];
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useToggleRoomStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ roomId, currentStatus }: { roomId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from("rooms")
        .update({ status: newStatus })
        .eq("id", roomId);

      if (error) throw error;
      return { roomId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({
        title: "Success",
        description: `Room ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
    },
    onError: (error) => {
      console.error("Error updating room status:", error);
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;
      return roomId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    },
  });
}
