
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./NotificationBell";
import { useNotifications } from "@/context/NotificationContext";
import { UserAvatar } from "./UserAvatar";
import { formatDistanceToNow } from "@/lib/format-date";

export function NotificationBellDropdown() {
  const { notifications, markAllAsRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-2">
          <span className="font-medium">Notifications</span>
          <button
            onClick={markAllAsRead}
            className="text-sm hover:underline"
          >
            Mark all as read
          </button>
        </DropdownMenuLabel>
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
