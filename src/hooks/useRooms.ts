
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
  photo_url: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Room[];
    },
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
