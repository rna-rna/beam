
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span 
          className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"
        />
      )}
    </Button>
  );
}
