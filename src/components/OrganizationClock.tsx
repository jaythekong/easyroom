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

  const formatTime = (date: Date, timezone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date, timezone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    }).format(date);
  };

  const getTimezoneAbbreviation = (timezone: string) => {
    const timezoneMap: { [key: string]: string } = {
      'America/New_York': 'EST/EDT',
      'America/Chicago': 'CST/CDT',
      'America/Denver': 'MST/MDT',
      'America/Los_Angeles': 'PST/PDT',
      'America/Phoenix': 'MST',
      'America/Anchorage': 'AKST/AKDT',
      'Pacific/Honolulu': 'HST',
      'Europe/London': 'GMT/BST',
      'Europe/Paris': 'CET/CEST',
      'Europe/Berlin': 'CET/CEST',
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Asia/Kolkata': 'IST',
      'Asia/Phnom_Penh': 'ICT',
      'Australia/Sydney': 'AEST/AEDT',
      'America/Toronto': 'EST/EDT',
      'America/Vancouver': 'PST/PDT'
    };
    return timezoneMap[timezone] || timezone.split('/')[1]?.replace('_', ' ');
  };

  const timezone = organization?.timezone || 'America/New_York';

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="p-1.5 bg-primary/10 rounded-lg">
        <Clock className="h-3 w-3 text-primary" />
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold text-foreground">
          {formatTime(currentTime, timezone)}
        </div>
        <div className="text-xs text-muted-foreground leading-none">
          {formatDate(currentTime, timezone)} • {getTimezoneAbbreviation(timezone)}
        </div>
      </div>
    </div>
  );
}