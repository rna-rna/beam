
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  groupId: string;
  type: string;
  data: any;
  count: number;
  latestTime: string;
}

export function NotificationBell() {
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryUrl: "/api/notifications",
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const unseenCount = notifications.length;

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative"
      aria-label={`${unseenCount} unread notifications`}
    >
      <Bell className="h-5 w-5" />
      {unseenCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
          {unseenCount > 99 ? '99+' : unseenCount}
        </span>
      )}
    </Button>
  );
}
