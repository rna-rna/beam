
import { Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "@/lib/format-date";
import { UserAvatar } from "./UserAvatar";

export function NotificationBell() {
  const { notifications, markAllAsRead } = useNotifications();
  const unseenCount = notifications.filter(n => !n.isSeen).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {unseenCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuHeader className="flex items-center justify-between px-4 py-2">
          <span className="font-medium">Notifications</span>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className="px-4 py-3 focus:bg-accent">
              <div className={`flex gap-3 ${!notif.isSeen ? 'font-medium' : ''}`}>
                <UserAvatar
                  size="sm"
                  name={notif.data.actorName || "Unknown"}
                  imageUrl={notif.data.actorAvatar}
                  color={notif.data.actorColor || "#ccc"}
                />
                <div className="flex flex-col gap-1">
                  <div className="text-sm">
                    {notif.type === "star" && (
                      <>{notif.data.actorName} starred your gallery</>
                    )}
                    {notif.type === "comment" && (
                      <>{notif.data.actorName} commented on your gallery</>
                    )}
                    {notif.type === "reply" && (
                      <>{notif.data.actorName} replied to your comment</>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notif.createdAt))} ago
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
