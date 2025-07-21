import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Search, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterState {
  date: Date | undefined;
  startTime: string;
  endTime: string;
  capacity: string;
  amenities: string[];
  searchTerm: string;
}

interface SearchFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

const availableAmenities = [
  "Monitor",
  "Projector", 
  "Video Conferencing",
  "Whiteboard",
  "WiFi",
  "Coffee Machine"
];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

export function SearchFilters({ onFiltersChange }: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    date: new Date(),
    startTime: "",
    endTime: "",
    capacity: "",
    amenities: [],
    searchTerm: ""
  });

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      date: new Date(),
      startTime: "",
      endTime: "",
      capacity: "",
      amenities: [],
      searchTerm: ""
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Search className="h-5 w-5" />
          Find Meeting Rooms
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search rooms</Label>
          <Input
            id="search"
            placeholder="Search by room name..."
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            className="bg-background"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !filters.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(filters.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.date}
                  onSelect={(date) => updateFilters({ date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Select value={filters.startTime} onValueChange={(value) => updateFilters({ startTime: value })}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Start time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Select value={filters.endTime} onValueChange={(value) => updateFilters({ endTime: value })}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="End time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <Label htmlFor="capacity">Minimum Capacity</Label>
          <Select value={filters.capacity} onValueChange={(value) => updateFilters({ capacity: value })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2+ people</SelectItem>
              <SelectItem value="4">4+ people</SelectItem>
              <SelectItem value="6">6+ people</SelectItem>
              <SelectItem value="8">8+ people</SelectItem>
              <SelectItem value="12">12+ people</SelectItem>
              <SelectItem value="20">20+ people</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <Label>Required Amenities</Label>
          <div className="grid grid-cols-2 gap-3">
            {availableAmenities.map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity}
                  checked={filters.amenities.includes(amenity)}
                  onCheckedChange={() => toggleAmenity(amenity)}
                />
                <Label
                  htmlFor={amenity}
                  className="text-sm font-normal cursor-pointer"
                >
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="flex-1"
          >
            Clear Filters
          </Button>
          <Button 
            className="flex-1"
            onClick={() => onFiltersChange(filters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}