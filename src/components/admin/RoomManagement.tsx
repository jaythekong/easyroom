
import { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddRoomModal } from "./AddRoomModal";
import { EditRoomModal } from "./EditRoomModal";
import { useRooms, useToggleRoomStatus, useDeleteRoom } from "@/hooks/useRooms";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

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

export function RoomManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: rooms = [], isLoading, error } = useRooms(true); // Include inactive rooms for admin
  const toggleRoomStatus = useToggleRoomStatus();
  const deleteRoom = useDeleteRoom();

  const filteredRooms = useMemo(() => {
    if (!debouncedSearch) return rooms;
    
    const query = debouncedSearch.toLowerCase();
    return rooms.filter(room =>
      room.name.toLowerCase().includes(query) ||
      room.location?.toLowerCase().includes(query)
    );
  }, [rooms, debouncedSearch]);

  const handleToggleStatus = (roomId: string, currentStatus: string) => {
    toggleRoomStatus.mutate({ roomId, currentStatus });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      return;
    }
    deleteRoom.mutate(roomId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Room Management</CardTitle>
              <CardDescription>
                Add, edit, and manage all meeting rooms in your organization
              </CardDescription>
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton type="room-cards" count={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load rooms. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Room Management</CardTitle>
            <CardDescription>
              Add, edit, and manage all meeting rooms in your organization
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search rooms by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery ? "No rooms found matching your search" : "No rooms configured yet"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.location || "Not specified"}</TableCell>
                    <TableCell>{room.capacity} people</TableCell>
                    <TableCell>
                      <Badge 
                        variant={room.status === 'active' ? 'success' : 'secondary'}
                      >
                        {room.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggleRoomStatus.isPending}
                          onClick={() => handleToggleStatus(room.id, room.status)}
                        >
                          {room.status === 'active' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRoom(room)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteRoom.isPending}
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AddRoomModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          // React Query will automatically refetch
        }}
      />

      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          open={!!editingRoom}
          onOpenChange={(open) => !open && setEditingRoom(null)}
          onSuccess={() => {
            // React Query will automatically refetch
          }}
        />
      )}
    </Card>
  );
}
