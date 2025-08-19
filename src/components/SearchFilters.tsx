import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Search, SlidersHorizontal, Clock, Users, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface FilterState {
  date: Date | undefined;
  startTime: string;
  endTime: string;
  capacity: string;
  amenities: string[];
  searchTerm: string;
  selectedRoom: string;
}

interface SearchFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  rooms?: Array<{ id: string; name: string; location?: string }>;
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

export function SearchFilters({ onFiltersChange, rooms = [] }: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    date: new Date(),
    startTime: "any",
    endTime: "any",
    capacity: "any",
    amenities: [],
    searchTerm: "",
    selectedRoom: "all"
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
      startTime: "any",
      endTime: "any",
      capacity: "any",
      amenities: [],
      searchTerm: "",
      selectedRoom: "all"
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Search className="h-3 w-3 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Smart Search</h3>
        </div>
        {(filters.searchTerm || filters.selectedRoom !== "all" || filters.capacity !== "any" || 
          filters.startTime !== "any" || filters.endTime !== "any" || filters.amenities.length > 0) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Horizontal Filter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Room & Search */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Room Selection</Label>
          <Select 
            value={filters.selectedRoom} 
            onValueChange={(value) => updateFilters({ selectedRoom: value })}
          >
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">🏢 All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  🚪 {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={filters.searchTerm}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
              className="h-8 pl-7 text-xs bg-background/50 border-border/50"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date & Time</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 text-xs w-full justify-start bg-background/50 border-border/50",
                  !filters.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {filters.date ? format(filters.date, "MMM dd") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
              <Calendar
                mode="single"
                selected={filters.date}
                onSelect={(date) => updateFilters({ date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="grid grid-cols-2 gap-1">
            <Select value={filters.startTime} onValueChange={(value) => updateFilters({ startTime: value })}>
              <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="any">Any</SelectItem>
                {timeSlots.slice(0, 10).map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.endTime} onValueChange={(value) => updateFilters({ endTime: value })}>
              <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                <SelectValue placeholder="Until" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="any">Any</SelectItem>
                {timeSlots.slice(5).map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Capacity</Label>
          <Select value={filters.capacity} onValueChange={(value) => updateFilters({ capacity: value })}>
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="8">8+</SelectItem>
              <SelectItem value="12">12+</SelectItem>
              <SelectItem value="20">20+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amenities & Search Button */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Features</Label>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {availableAmenities.slice(0, 6).map((amenity) => (
              <div 
                key={amenity} 
                className={cn(
                  "flex items-center justify-center p-1 rounded border text-xs cursor-pointer transition-colors",
                  filters.amenities.includes(amenity) 
                    ? "bg-primary/10 border-primary/30 text-primary" 
                    : "bg-background/50 border-border/50 hover:border-primary/30"
                )}
                onClick={() => toggleAmenity(amenity)}
                title={amenity}
              >
                {amenity.slice(0, 3)}
              </div>
            ))}
          </div>
          <Button 
            className="w-full h-8 text-xs"
            onClick={() => onFiltersChange(filters)}
          >
            <Search className="h-3 w-3 mr-1" />
            Search
          </Button>
        </div>
      </div>

      {/* Active Filters - Compact */}
      {(filters.searchTerm || filters.selectedRoom !== "all" || filters.capacity !== "any" || 
        filters.startTime !== "any" || filters.endTime !== "any" || filters.amenities.length > 0) && (
        <div className="flex flex-wrap gap-1 p-2 rounded-md bg-muted/20 border border-border/30">
          {filters.selectedRoom !== "all" && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              {rooms.find(r => r.id === filters.selectedRoom)?.name || filters.selectedRoom}
            </span>
          )}
          {filters.searchTerm && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              "{filters.searchTerm}"
            </span>
          )}
          {filters.capacity !== "any" && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              {filters.capacity}+ people
            </span>
          )}
          {filters.startTime !== "any" && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              From {filters.startTime}
            </span>
          )}
          {filters.endTime !== "any" && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              Until {filters.endTime}
            </span>
          )}
          {filters.amenities.map((amenity) => (
            <span key={amenity} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20">
              {amenity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}