import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTelegramStatus } from "@/hooks/useTelegramStatus";

interface TelegramBannerProps {
  organization: {
    id: string;
    slug: string;
    telegram_cta_enabled?: boolean;
    telegram_bot_token?: string;
  };
}

export function TelegramBanner({ organization }: TelegramBannerProps) {
  const { data: hasSub, isLoading } = useTelegramStatus(organization.id);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(`tgDismiss_${organization.id}`) === '1'
  );

  // Don't show if: loading, user has subscription, dismissed, CTA disabled, or no bot token
  if (
    isLoading || 
    hasSub || 
    dismissed || 
    organization.telegram_cta_enabled === false ||
    !organization.telegram_bot_token
  ) {
    return null;
  }

  // Extract bot username from token format: "1234567890:ABC..."
  const botToken = organization.telegram_bot_token;
  const botId = botToken.split(':')[0];
  const link = `https://t.me/bot${botId}?start=${organization.slug}`;

  const handleDismiss = () => {
    localStorage.setItem(`tgDismiss_${organization.id}`, '1');
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 p-4 rounded-lg mb-6">
      <div className="text-2xl">📲</div>
      <div className="flex-1">
        <p className="font-medium text-foreground">Get instant booking alerts in Telegram</p>
        <p className="text-sm text-muted-foreground">
          Connect once – we'll dm you when rooms are booked or cancelled.
        </p>
      </div>
      <Button asChild className="shrink-0">
        <a href={link} target="_blank" rel="noopener noreferrer">
          Connect
        </a>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="shrink-0 p-2"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}