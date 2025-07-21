import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, AlertTriangle, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DowntimeEntry {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: 'maintenance' | 'renovation' | 'cleaning' | 'other';
}

interface RoomDowntimeCardProps {
  roomId: string;
  roomName: string;
}

export function RoomDowntimeCard({ roomId, roomName }: RoomDowntimeCardProps) {
  const [downtimes, setDowntimes] = useState<DowntimeEntry[]>([]);
  const [isAddingDowntime, setIsAddingDowntime] = useState(false);
  const [editingDowntime, setEditingDowntime] = useState<DowntimeEntry | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [type, setType] = useState<DowntimeEntry['type']>('maintenance');

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(undefined);
    setEndDate(undefined);
    setType('maintenance');
  };

  const handleAddDowntime = () => {
    if (!title || !startDate || !endDate) return;
    
    const newDowntime: DowntimeEntry = {
      id: Date.now().toString(),
      title,
      description,
      startDate,
      endDate,
      type
    };
    
    setDowntimes(prev => [...prev, newDowntime]);
    resetForm();
    setIsAddingDowntime(false);
  };

  const handleEditDowntime = () => {
    if (!editingDowntime || !title || !startDate || !endDate) return;
    
    setDowntimes(prev => prev.map(d => 
      d.id === editingDowntime.id 
        ? { ...d, title, description, startDate, endDate, type }
        : d
    ));
    resetForm();
    setEditingDowntime(null);
  };

  const handleDeleteDowntime = (id: string) => {
    setDowntimes(prev => prev.filter(d => d.id !== id));
  };

  const openEditDialog = (downtime: DowntimeEntry) => {
    setTitle(downtime.title);
    setDescription(downtime.description || "");
    setStartDate(downtime.startDate);
    setEndDate(downtime.endDate);
    setType(downtime.type);
    setEditingDowntime(downtime);
  };

  const getTypeColor = (type: DowntimeEntry['type']) => {
    switch (type) {
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'renovation': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cleaning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: DowntimeEntry['type']) => {
    switch (type) {
      case 'maintenance': return <AlertTriangle className="h-3 w-3" />;
      case 'renovation': return <Edit className="h-3 w-3" />;
      case 'cleaning': return <Clock className="h-3 w-3" />;
      case 'other': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{roomName}</CardTitle>
          <Dialog open={isAddingDowntime} onOpenChange={setIsAddingDowntime}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add Downtime
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule Downtime</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., HVAC Maintenance"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DowntimeEntry['type'])}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="renovation">Renovation</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details about the downtime..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingDowntime(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDowntime}>
                  Schedule Downtime
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Scheduled maintenance and downtime periods
        </p>
      </CardHeader>
      <CardContent>
        {downtimes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scheduled downtime</p>
          </div>
        ) : (
          <div className="space-y-3">
            {downtimes.map((downtime) => (
              <div
                key={downtime.id}
                className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{downtime.title}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className={cn("text-xs", getTypeColor(downtime.type))}>
                        {getTypeIcon(downtime.type)}
                        <span className="ml-1 capitalize">{downtime.type}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editingDowntime?.id === downtime.id} onOpenChange={(open) => !open && setEditingDowntime(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => openEditDialog(downtime)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Downtime</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="e.g., HVAC Maintenance"
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                              value={type}
                              onChange={(e) => setType(e.target.value as DowntimeEntry['type'])}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="maintenance">Maintenance</option>
                              <option value="renovation">Renovation</option>
                              <option value="cleaning">Cleaning</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Start Date</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "justify-start text-left font-normal",
                                      !startDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : "Pick date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">End Date</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "justify-start text-left font-normal",
                                      !endDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : "Pick date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Additional details about the downtime..."
                              rows={3}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingDowntime(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditDowntime}>
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteDowntime(downtime.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(downtime.startDate, "MMM d, yyyy")} - {format(downtime.endDate, "MMM d, yyyy")}
                </div>
                {downtime.description && (
                  <p className="text-xs text-muted-foreground">{downtime.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}