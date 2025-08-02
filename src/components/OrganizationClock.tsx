import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

export function OrganizationClock() {
  const { organization } = useOrganization();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getTimezoneAbbreviation = () => {
    // Get the local timezone abbreviation
    return new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short'
    }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || 'Local Time';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="p-1.5 bg-primary/10 rounded-lg">
        <Clock className="h-3 w-3 text-primary" />
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold text-foreground">
          {formatTime(currentTime)}
        </div>
        <div className="text-xs text-muted-foreground leading-none">
          {formatDate(currentTime)} • {getTimezoneAbbreviation()}
        </div>
      </div>
    </div>
  );
}