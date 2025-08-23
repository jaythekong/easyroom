import React from 'react';

export function DemoOrganizationClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York'
  });

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>🕐</span>
        <span>{timeString}</span>
        <span className="text-xs">EST</span>
      </div>
      <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Demo</span>
    </div>
  );
}