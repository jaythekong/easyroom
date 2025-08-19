import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, MessageSquare, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

interface TickerMessage {
  id: string;
  message: string;
  emoji: string;
  is_active: boolean;
  order_index: number;
  background_color: string;
  text_color: string;
  speed: number;
  frequency: number;
  created_at: string;
  updated_at: string;
}

const emojiOptions = [
  "📢", "🎉", "⚡", "💬", "🚀", "✨", "🎯", "💡", "🔥", "⭐", 
  "👋", "📅", "🏢", "💼", "📍", "🎪", "🌟", "🎊", "📣", "🎁", "🇰🇭"
];

export function TickerManagement() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TickerMessage | null>(null);
  const [formData, setFormData] = useState({
    message: "",
    emoji: "📢",
    background_color: "#3B82F6",
    text_color: "#FFFFFF",
    speed: 50,
    frequency: 1,
    is_active: true
  });
  const { organization } = useOrganization();
  const { toast } = useToast();

  useEffect(() => {
    if (organization?.id) {
      fetchMessages();
    }
  }, [organization?.id]);

  const fetchMessages = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ticker_messages')
      .select('*')
      .eq('organization_id', organization.id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching ticker messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ticker messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    const payload = {
      ...formData,
      organization_id: organization.id,
      order_index: editingMessage ? editingMessage.order_index : messages.length + 1
    };

    const { error } = editingMessage
      ? await supabase
          .from('ticker_messages')
          .update(payload)
          .eq('id', editingMessage.id)
      : await supabase
          .from('ticker_messages')
          .insert([payload]);

    if (error) {
      console.error('Error saving ticker message:', error);
      toast({
        title: "Error",
        description: "Failed to save ticker message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Ticker message ${editingMessage ? 'updated' : 'created'} successfully`,
      });
      setIsDialogOpen(false);
      setEditingMessage(null);
      setFormData({
        message: "",
        emoji: "📢",
        background_color: "#3B82F6",
        text_color: "#FFFFFF",
        speed: 50,
        frequency: 1,
        is_active: true
      });
      fetchMessages();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('ticker_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticker message:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticker message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticker message deleted successfully",
      });
      fetchMessages();
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('ticker_messages')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (error) {
      console.error('Error toggling ticker message:', error);
      toast({
        title: "Error",
        description: "Failed to update ticker message",
        variant: "destructive",
      });
    } else {
      fetchMessages();
    }
  };

  const openEditDialog = (message: TickerMessage) => {
    setEditingMessage(message);
    setFormData({
      message: message.message,
      emoji: message.emoji,
      background_color: message.background_color,
      text_color: message.text_color,
      speed: message.speed,
      frequency: message.frequency,
      is_active: message.is_active
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Ticker Messages</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMessage ? 'Edit' : 'Add'} Ticker Message
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your ticker message..."
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emoji">Emoji</Label>
                    <Select 
                      value={formData.emoji} 
                      onValueChange={(value) => setFormData({ ...formData, emoji: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {emojiOptions.map((emoji) => (
                          <SelectItem key={emoji} value={emoji}>
                            {emoji} {emoji}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speed">Speed (px/s)</Label>
                    <Input
                      id="speed"
                      type="number"
                      value={formData.speed}
                      onChange={(e) => setFormData({ ...formData, speed: parseInt(e.target.value) || 50 })}
                      min="10"
                      max="200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      type="number"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-muted-foreground">
                      How often this appears (1=normal, 2=twice as often)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingMessage(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingMessage ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No ticker messages yet</p>
            <p className="text-sm text-muted-foreground">Add your first message to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50"
              >
                <div className="flex items-center gap-2 cursor-grab">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg">{message.emoji}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {message.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={message.is_active ? "default" : "secondary"} className="text-xs">
                      {message.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Speed: {message.speed}px/s
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Frequency: {message.frequency}x
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    checked={message.is_active}
                    onCheckedChange={() => toggleActive(message.id, message.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(message)}
                    className="p-2"
                  >
                    <Palette className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(message.id)}
                    className="p-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <div className="relative bg-primary text-primary-foreground rounded overflow-hidden">
              <div className="flex items-center px-4 py-2">
                <div className="relative flex-1 overflow-hidden">
                  <div className="flex items-center gap-8 whitespace-nowrap">
                    {messages.filter(m => m.is_active).map((msg) => (
                      <div key={msg.id} className="flex items-center gap-2 text-sm">
                        <span>{msg.emoji}</span>
                        <span>{msg.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}