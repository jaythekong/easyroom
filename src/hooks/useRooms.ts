
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

export function useRooms(includeInactive = false) {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['rooms', organization?.id, includeInactive],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }

      let query = supabase
        .from("rooms")
        .select(`
          *,
          room_amenities (
            amenities (
              name
            )
          )
        `)
        .eq("organization_id", organization.id);

      // Only filter by active status if not including inactive rooms
      if (!includeInactive) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      // Format rooms with amenities
      const formattedRooms = (data || []).map(room => ({
        ...room,
        amenities: room.room_amenities?.map((ra: any) => ra.amenities.name) || []
      }));
      
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

export function useAddRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (roomData: {
      name: string;
      location?: string;
      capacity: number;
      description?: string;
      photo_url?: string;
      status: 'active' | 'inactive';
      selectedAmenities: string[];
    }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      // Insert room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          name: roomData.name,
          location: roomData.location || null,
          capacity: roomData.capacity,
          description: roomData.description || null,
          photo_url: roomData.photo_url || null,
          status: roomData.status,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Insert room amenities
      if (roomData.selectedAmenities.length > 0) {
        const roomAmenities = roomData.selectedAmenities.map(amenityId => ({
          room_id: room.id,
          amenity_id: amenityId,
        }));

        const { error: amenitiesError } = await supabase
          .from("room_amenities")
          .insert(roomAmenities);

        if (amenitiesError) throw amenitiesError;
      }

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({
        title: "Success",
        description: "Room added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding room:", error);
      toast({
        title: "Error",
        description: "Failed to add room",
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
