import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";

interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.isSeen).length;

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={onClick}
      className="relative"
      aria-label={`${unreadCount} unread notifications`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}