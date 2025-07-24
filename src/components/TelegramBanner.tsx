import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle } from "lucide-react";
import { useTelegramStatus } from "@/hooks/useTelegramStatus";

interface TelegramBannerProps {
  organization: {
    id: string;
    slug: string;
    telegram_cta_enabled?: boolean;
    telegram_bot_token?: string;
    telegram_bot_username?: string;
  };
}

export function TelegramBanner({ organization }: TelegramBannerProps) {
  const { data: hasSub, isLoading } = useTelegramStatus(organization.id);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(`tgDismiss_${organization.id}`) === '1'
  );

  // Debug what we receive
  console.log('TelegramBanner received:', {
    orgId: organization.id,
    telegram_cta_enabled: organization.telegram_cta_enabled,
    telegram_bot_token: organization.telegram_bot_token ? 'EXISTS' : 'MISSING',
    telegram_bot_username: organization.telegram_bot_username || 'MISSING',
    hasSub,
    isLoading,
    dismissed
  });

  // FORCE-SHOW DEBUG - Remove after testing
  console.log('FORCE-SHOW DEBUG:', { 
    isLoading, 
    hasSub, 
    dismissed, 
    cta: organization?.telegram_cta_enabled,
    has_token: !!organization?.telegram_bot_token,
    has_username: !!organization?.telegram_bot_username
  });

  // Don't show if CTA disabled, no bot configured, or user dismissed it
  if (
    organization.telegram_cta_enabled === false ||
    !organization.telegram_bot_token ||
    !organization.telegram_bot_username ||
    dismissed
  ) {
    console.log('TelegramBanner: Hidden due to config', {
      cta_enabled: organization.telegram_cta_enabled,
      has_token: !!organization.telegram_bot_token,
      has_username: !!organization.telegram_bot_username,
      dismissed
    });
    return null;
  }

  const link = `https://t.me/${organization.telegram_bot_username}?start=${organization.slug}`;

  const handleDismiss = () => {
    localStorage.setItem(`tgDismiss_${organization.id}`, '1');
    setDismissed(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 p-4 rounded-lg mb-6">
        <div className="text-2xl">📲</div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Checking Telegram connection...</p>
        </div>
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

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg mb-6 ${
      hasSub 
        ? "bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/30" 
        : "bg-primary/5 border border-primary/20"
    }`}>
      <div className="text-2xl">
        {hasSub ? "✅" : "📲"}
      </div>
      <div className="flex-1">
        {hasSub ? (
          <>
            <p className="font-medium text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Connected to Telegram notifications
            </p>
            <p className="text-sm text-muted-foreground">
              You'll receive booking alerts in your Telegram DMs.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">Get instant booking alerts in Telegram</p>
            <p className="text-sm text-muted-foreground">
              Connect once – we'll dm you when rooms are booked or cancelled.
            </p>
          </>
        )}
      </div>
      {!hasSub && (
        <Button asChild className="shrink-0">
          <a href={link} target="_blank" rel="noopener noreferrer">
            Connect
          </a>
        </Button>
      )}
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