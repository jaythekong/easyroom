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
    <div className="space-y-4">
      {/* Header with Clear Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Smart Room Search</h3>
        </div>
        {(filters.searchTerm || filters.selectedRoom !== "all" || filters.capacity !== "any" || 
          filters.startTime !== "any" || filters.endTime !== "any" || filters.amenities.length > 0) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Primary Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Room Selection & Search */}
        <Card className="timeline-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Search className="h-4 w-4 text-primary" />
              Room Selection
            </div>
            
            <div className="space-y-3">
              <Select 
                value={filters.selectedRoom} 
                onValueChange={(value) => updateFilters({ selectedRoom: value })}
              >
                <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Choose specific room..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">🏢 All Rooms</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      🚪 {room.name} {room.location && `• ${room.location}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Or search by room name..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                  className="pl-10 bg-background/50 border-border/50 hover:border-primary/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card className="timeline-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              When & Duration
            </div>
            
            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/50 border-border/50 hover:border-primary/50",
                      !filters.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date ? format(filters.date, "PPP") : "Pick a date"}
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

              <div className="grid grid-cols-2 gap-2">
                <Select value={filters.startTime} onValueChange={(value) => updateFilters({ startTime: value })}>
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 text-xs">
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="any">Any time</SelectItem>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.endTime} onValueChange={(value) => updateFilters({ endTime: value })}>
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 text-xs">
                    <SelectValue placeholder="Until" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="any">Any time</SelectItem>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Capacity */}
        <Card className="timeline-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Capacity Needed
            </div>
            
            <Select value={filters.capacity} onValueChange={(value) => updateFilters({ capacity: value })}>
              <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50">
                <SelectValue placeholder="How many people?" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="any">👥 Any capacity</SelectItem>
                <SelectItem value="2">👥 2+ people</SelectItem>
                <SelectItem value="4">👥 4+ people</SelectItem>
                <SelectItem value="6">👥 6+ people</SelectItem>
                <SelectItem value="8">👥 8+ people</SelectItem>
                <SelectItem value="12">👥 12+ people</SelectItem>
                <SelectItem value="20">👥 20+ people</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card className="timeline-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Required Features
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {availableAmenities.map((amenity) => (
                <div 
                  key={amenity} 
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-lg border transition-colors cursor-pointer",
                    filters.amenities.includes(amenity) 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-background/50 border-border/50 hover:border-primary/30"
                  )}
                  onClick={() => toggleAmenity(amenity)}
                >
                  <Checkbox
                    id={amenity}
                    checked={filters.amenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                    className="pointer-events-none"
                  />
                  <Label
                    htmlFor={amenity}
                    className="text-xs font-medium cursor-pointer flex-1 pointer-events-none"
                  >
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Action */}
      <div className="flex gap-3">
        <Button 
          className="flex-1 quick-book-button text-primary-foreground"
          onClick={() => onFiltersChange(filters)}
        >
          <Search className="h-4 w-4 mr-2" />
          Find Available Rooms
        </Button>
      </div>

      {/* Active Filters Summary */}
      {(filters.searchTerm || filters.selectedRoom !== "all" || filters.capacity !== "any" || 
        filters.startTime !== "any" || filters.endTime !== "any" || filters.amenities.length > 0) && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="text-xs text-muted-foreground mb-2">Active filters:</div>
          <div className="flex flex-wrap gap-1">
            {filters.selectedRoom !== "all" && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                Room: {rooms.find(r => r.id === filters.selectedRoom)?.name || filters.selectedRoom}
              </span>
            )}
            {filters.searchTerm && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                Search: "{filters.searchTerm}"
              </span>
            )}
            {filters.capacity !== "any" && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                {filters.capacity}+ people
              </span>
            )}
            {filters.startTime !== "any" && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                From {filters.startTime}
              </span>
            )}
            {filters.endTime !== "any" && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                Until {filters.endTime}
              </span>
            )}
            {filters.amenities.map((amenity) => (
              <span key={amenity} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}