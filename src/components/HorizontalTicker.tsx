import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface TickerMessage {
  id: string;
  message: string;
  emoji: string;
  background_color: string;
  text_color: string;
  speed: number;
  order_index: number;
}

export function HorizontalTicker() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.id) return;

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

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

  // Calculate dynamic speed based on content and first message speed
  const primaryMessage = messages[0];
  const baseSpeed = primaryMessage?.speed || 50; // pixels per second
  const totalWidth = messages.length * 300; // Approximate width per message
  const animationDuration = totalWidth / baseSpeed; // seconds

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
            <div className="ticker-animate flex items-center gap-8 whitespace-nowrap">
              {[...messages, ...messages, ...messages].map((msg, index) => (
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