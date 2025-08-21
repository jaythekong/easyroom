import { useState, useEffect } from "react";
import { MessageSquare, TestTube, ExternalLink, Check, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Organization {
  id: string;
  name: string;
  telegram_bot_token?: string;
  telegram_bot_username?: string;
  welcome_message?: string;
}

interface TelegramSubscriber {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
  created_at: string;
  user_id?: string;
}

export function TelegramNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organization: contextOrg } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [originalTelegramBotToken, setOriginalTelegramBotToken] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [originalWelcomeMessage, setOriginalWelcomeMessage] = useState("");
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botInfo, setBotInfo] = useState<{username?: string, first_name?: string} | null>(null);
  const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);

  useEffect(() => {
    if (contextOrg?.id) {
      fetchOrganization();
    }
  }, [contextOrg?.id]);

  const fetchOrganization = async () => {
    if (!contextOrg?.id) return;

    try {
      // Get organization details directly
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', contextOrg.id)
        .single();

      if (orgError) throw orgError;

      setOrganization(org);
      setTelegramBotToken(org.telegram_bot_token || "");
      setOriginalTelegramBotToken(org.telegram_bot_token || "");
      setWelcomeMessage(org.welcome_message || "Welcome! You have successfully subscribed to booking notifications. You will receive updates when bookings are made, modified, or cancelled.");
      setOriginalWelcomeMessage(org.welcome_message || "Welcome! You have successfully subscribed to booking notifications. You will receive updates when bookings are made, modified, or cancelled.");

      // Fetch subscribers
      if (org.telegram_bot_token) {
        fetchSubscribers(contextOrg.id);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
        variant: "destructive",
      });
    }
  };

  const fetchSubscribers = async (organizationId: string) => {
    setIsLoadingSubscribers(true);
    try {
      const { data, error } = await supabase
        .from('telegram_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubscribers(data || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast({
        title: "Error",
        description: "Failed to load subscribers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubscribers(false);
    }
  };

  const deleteSubscriber = async (subscriberId: string) => {
    try {
      const { error } = await supabase
        .from('telegram_subscriptions')
        .delete()
        .eq('id', subscriberId);

      if (error) throw error;

      setSubscribers(prev => prev.filter(s => s.id !== subscriberId));
      toast({
        title: "Success",
        description: "Subscriber removed successfully",
      });
    } catch (error: any) {
      console.error('Error deleting subscriber:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove subscriber",
        variant: "destructive",
      });
    }
  };

  const testTelegramBot = async () => {
    if (!telegramBotToken || !organization) {
      toast({
        title: "Missing Information",
        description: "Please save your bot token first",
        variant: "destructive",
      });
      return;
    }

    // Validate bot token format
    if (!telegramBotToken.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      toast({
        title: "Invalid Bot Token",
        description: "Bot token should look like: 123456789:ABCdefGhIjKlMnOpQrStUvWxYz",
        variant: "destructive",
      });
      return;
    }

    setIsTestingBot(true);
    try {
      const response = await supabase.functions.invoke('telegram-bot-setup', {
        body: {
          organizationId: organization.id,
          botToken: telegramBotToken
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to test bot');
      }

      setBotInfo(response.data.botInfo);
      toast({
        title: "Bot Test Successful! 🎉",
        description: `Bot @${response.data.botInfo.username} is ready to receive subscriptions`,
      });
    } catch (error: any) {
      console.error('Bot test error:', error);
      toast({
        title: "Bot Test Failed",
        description: error.message || "Failed to test bot configuration",
        variant: "destructive",
      });
    } finally {
      setIsTestingBot(false);
    }
  };

  const saveSettings = async () => {
    if (!organization) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          telegram_bot_token: telegramBotToken || null,
          telegram_bot_username: botInfo?.username || null,
          welcome_message: welcomeMessage,
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOriginalTelegramBotToken(telegramBotToken);
      setOriginalWelcomeMessage(welcomeMessage);
      toast({
        title: "Settings saved",
        description: "Telegram notifications settings have been updated successfully",
      });

      // Refresh data
      fetchOrganization();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Telegram settings...</p>
        </div>
      </div>
    );
  }

  const hasChanges = telegramBotToken !== originalTelegramBotToken || 
                   welcomeMessage !== originalWelcomeMessage ||
                   (botInfo?.username && botInfo.username !== organization.telegram_bot_username);

  return (
    <div className="space-y-6">
      {/* Telegram Bot Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Telegram Bot Configuration
          </CardTitle>
          <CardDescription>
            Configure your Telegram bot for room booking notifications. Users can subscribe directly to your bot to receive updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
            <Input
              id="telegramBotToken"
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          {/* Test Bot Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={testTelegramBot}
              disabled={!telegramBotToken || isTestingBot}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTestingBot ? "Testing..." : "Test Bot"}
            </Button>
            
            {botInfo && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  Bot Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  @{botInfo.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://t.me/${botInfo.username}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">How to set up Telegram notifications:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Message @BotFather on Telegram and create a new bot with /newbot</li>
              <li>Copy the bot token from BotFather and paste it above</li>
              <li>Share the bot username (e.g., @your-company-bot) with your team members</li>
              <li>Team members start the bot by sending /start to subscribe to notifications</li>
              <li>Save your settings - all subscribed users will receive booking notifications!</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">🎉 No more chat IDs needed!</p>
              <p className="text-sm text-blue-600 mt-1">
                Users can now subscribe directly by starting your bot on Telegram. 
                Much simpler than finding chat IDs!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Welcome Message
          </CardTitle>
          <CardDescription>
            Configure the message users receive when they first subscribe to your bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Enter the welcome message for new subscribers..."
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This message will be sent when users send /start to your bot
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscriber Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscriber Management
          </CardTitle>
          <CardDescription>
            View and manage users who have subscribed to your Telegram notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSubscribers ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading subscribers...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No subscribers yet. Share your bot with team members to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Chat ID</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>
                        {subscriber.telegram_username ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              @{subscriber.telegram_username}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {subscriber.telegram_chat_id}
                      </TableCell>
                      <TableCell>
                        {new Date(subscriber.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this subscriber? They will no longer receive notifications.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSubscriber(subscriber.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}