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

interface AddRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Amenity {
  id: string;
  name: string;
  description: string;
}

export function AddRoomModal({ open, onOpenChange, onSuccess }: AddRoomModalProps) {
  const [loading, setLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    capacity: "",
    description: "",
    photo_url: "",
    status: "active" as "active" | "inactive",
    selectedAmenities: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAmenities();
      // Reset form when modal opens
      setFormData({
        name: "",
        location: "",
        capacity: "",
        description: "",
        photo_url: "",
        status: "active",
        selectedAmenities: [],
      });
    }
  }, [open]);

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

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedAmenities: checked
        ? [...prev.selectedAmenities, amenityId]
        : prev.selectedAmenities.filter(id => id !== amenityId)
    }));
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

      // Get user's organization ID
      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organization_id');

      if (orgError) throw new Error('Failed to get organization');
      if (!orgData) throw new Error('No organization found for user');

      // Insert room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          name: formData.name,
          location: formData.location || null,
          capacity,
          description: formData.description || null,
          photo_url: formData.photo_url || null,
          status: formData.status,
          organization_id: orgData,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Insert room amenities
      if (formData.selectedAmenities.length > 0) {
        const roomAmenities = formData.selectedAmenities.map(amenityId => ({
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
        description: "Room added successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding room:", error);
      toast({
        title: "Error",
        description: "Failed to add room",
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
          <DialogTitle>Add New Room</DialogTitle>
          <DialogDescription>
            Create a new meeting room that users can book
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
                      checked={formData.selectedAmenities.includes(amenity.id)}
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
              {loading ? "Adding..." : "Add Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}