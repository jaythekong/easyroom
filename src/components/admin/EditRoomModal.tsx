import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
  photo_url: string;
  status: 'active' | 'inactive';
}

interface EditRoomModalProps {
  room: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Amenity {
  id: string;
  name: string;
  description: string;
}

export function EditRoomModal({ room, open, onOpenChange, onSuccess }: EditRoomModalProps) {
  const [loading, setLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: room.name,
    location: room.location || "",
    capacity: room.capacity.toString(),
    description: room.description || "",
    photo_url: room.photo_url || "",
    status: room.status,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAmenities();
      fetchRoomAmenities();
      setFormData({
        name: room.name,
        location: room.location || "",
        capacity: room.capacity.toString(),
        description: room.description || "",
        photo_url: room.photo_url || "",
        status: room.status,
      });
    }
  }, [open, room]);

  const fetchAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from("amenities")
        .select("*")
        .order("name");

      if (error) throw error;
      setAmenities(data || []);
    } catch (error) {
      console.error("Error fetching amenities:", error);
    }
  };

  const fetchRoomAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from("room_amenities")
        .select("amenity_id")
        .eq("room_id", room.id);

      if (error) throw error;
      setSelectedAmenities(data?.map(ra => ra.amenity_id) || []);
    } catch (error) {
      console.error("Error fetching room amenities:", error);
    }
  };

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    setSelectedAmenities(prev =>
      checked
        ? [...prev, amenityId]
        : prev.filter(id => id !== amenityId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.capacity) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const capacity = parseInt(formData.capacity);
      if (isNaN(capacity) || capacity <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid capacity",
          variant: "destructive",
        });
        return;
      }

      // Update room
      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          name: formData.name,
          location: formData.location || null,
          capacity,
          description: formData.description || null,
          photo_url: formData.photo_url || null,
          status: formData.status,
        })
        .eq("id", room.id);

      if (roomError) throw roomError;

      // Update room amenities
      // First, delete existing amenities
      const { error: deleteError } = await supabase
        .from("room_amenities")
        .delete()
        .eq("room_id", room.id);

      if (deleteError) throw deleteError;

      // Then insert new amenities
      if (selectedAmenities.length > 0) {
        const roomAmenities = selectedAmenities.map(amenityId => ({
          room_id: room.id,
          amenity_id: amenityId,
        }));

        const { error: amenitiesError } = await supabase
          .from("room_amenities")
          .insert(roomAmenities);

        if (amenitiesError) throw amenitiesError;
      }

      toast({
        title: "Success",
        description: "Room updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating room:", error);
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>
            Update the details for "{room.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., The Boardroom"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Building A, 3rd Floor"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="Maximum number of people"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: "active" | "inactive") => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the room and its features"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo_url">Photo URL</Label>
            <Input
              id="photo_url"
              type="url"
              value={formData.photo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, photo_url: e.target.value }))}
              placeholder="https://example.com/room-photo.jpg"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map((amenity) => (
                  <div key={amenity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity.id}
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={(checked) => 
                        handleAmenityChange(amenity.id, !!checked)
                      }
                    />
                    <Label htmlFor={amenity.id} className="text-sm font-medium">
                      {amenity.name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}