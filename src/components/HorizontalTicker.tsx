import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface TickerMessage {
  id: string;
  message: string;
  emoji: string;
  background_color: string;
  text_color: string;
  frequency: number;
  order_index: number;
}

interface TickerSettings {
  master_speed: number;
  message_spacing: number;
}

export function HorizontalTicker() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [settings, setSettings] = useState<TickerSettings>({
    master_speed: 50,
    message_spacing: 8
  });
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.id) return;

    fetchMessages();
    fetchSettings();

    // Subscribe to real-time updates for both messages and settings
    const messagesChannel = supabase
      .channel('ticker-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticker_messages',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('ticker-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticker_settings',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [organization?.id]);

  const fetchSettings = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('ticker_settings')
      .select('*')
      .eq('organization_id', organization.id)
      .single();

    if (error) {
      console.error('Error fetching ticker settings:', error);
      // Use defaults if no settings found
      return;
    }

    if (data) {
      setSettings({
        master_speed: data.master_speed,
        message_spacing: data.message_spacing
      });
    }
  };

  const fetchMessages = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('ticker_messages')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching ticker messages:', error);
      return;
    }

    setMessages(data || []);
  };

  if (!messages.length || !isVisible) return null;

  // Create message cycles based on frequency
  // First, show all messages once, then add extra cycles for higher frequency messages
  const createMessageCycles = () => {
    const maxFrequency = Math.max(...messages.map(msg => msg.frequency || 1));
    const cycles = [];
    
    // Create cycles - each cycle shows all messages once
    for (let cycle = 1; cycle <= maxFrequency; cycle++) {
      messages.forEach(msg => {
        const frequency = msg.frequency || 1;
        // Only include message in this cycle if its frequency is >= current cycle number
        if (frequency >= cycle) {
          cycles.push({ ...msg, id: `${msg.id}-cycle-${cycle}` });
        }
      });
    }
    
    return cycles;
  };

  const expandedMessages = createMessageCycles();

  // Calculate dynamic speed based on organization settings
  const totalWidth = expandedMessages.length * 300; // Approximate width per message
  const animationDuration = totalWidth / settings.master_speed; // seconds

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-animate {
          animation: ticker-scroll ${animationDuration}s linear infinite;
        }
      `}</style>
      
      <div className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="relative flex-1 overflow-hidden">
            <div className={`ticker-animate flex items-center whitespace-nowrap`} style={{ gap: `${settings.message_spacing * 4}px` }}>
              {expandedMessages.map((msg, index) => (
                <div key={`${msg.id}-${index}`} className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-base">{msg.emoji}</span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="ml-4 p-1 rounded hover:bg-primary-foreground/10 transition-colors"
            aria-label="Close ticker"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}