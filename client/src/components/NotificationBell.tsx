import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface Notification {
  groupId: string;
  type: string;
  data: any;
  count: number;
  latestTime: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  onClick: () => void;
}

export function NotificationBell({ notifications, onClick }: NotificationBellProps) {
  const unseenCount = notifications.filter(n => !n.isSeen).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={`${unseenCount} unread notifications`}
          onClick={onClick}
        >
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unseenCount > 99 ? '99+' : unseenCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown 
          notifications={notifications} 
          onMarkAllAsRead={onClick}
        />
      </PopoverContent>
    </Popover>
  );
}