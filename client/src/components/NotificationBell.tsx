
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface NotificationBellProps {
  unseenCount: number;
}

export function NotificationBell({ unseenCount }: NotificationBellProps) {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unseenCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
        >
          {unseenCount}
        </Badge>
      )}
    </Button>
  );
}
