
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { slug } = useParams();
  
  const { data: initialNotifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryUrl: "/api/notifications",
    onSuccess: (data) => setNotifications(data)
  });

  const consolidateNotifications = (prevNotifications: Notification[], newNotification: Notification) => {
    const existingGroup = prevNotifications.find((n) => n.groupId === newNotification.groupId);

    if (existingGroup) {
      return prevNotifications.map(n => 
        n.groupId === newNotification.groupId 
          ? { ...n, count: n.count + 1, latestTime: newNotification.timestamp }
          : n
      );
    }
    
    return [...prevNotifications, newNotification];
  };

  useEffect(() => {
    if (!slug) return;
    
    const channel = pusher.subscribe(`gallery-${slug}`);

    channel.bind("image-starred", (data: Notification) => {
      setNotifications(prev => consolidateNotifications(prev, {
        ...data,
        type: "image-starred",
        timestamp: new Date().toISOString()
      }));
    });

    channel.bind("comment-added", (data: Notification) => {
      setNotifications(prev => consolidateNotifications(prev, {
        ...data,
        type: "comment-added",
        timestamp: new Date().toISOString()
      }));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`gallery-${slug}`);
    };
  }, [slug]);

  const unseenCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
}
