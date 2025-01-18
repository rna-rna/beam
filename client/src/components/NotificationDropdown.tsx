
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "./UserAvatar";

interface NotificationGroup {
  groupId: string;
  type: string;
  data: {
    actorId: string;
    actorName?: string;
    count?: number;
  };
  count: number;
  latestTime: string;
}

interface NotificationDropdownProps {
  notifications: NotificationGroup[];
}

export function NotificationDropdown({ notifications }: NotificationDropdownProps) {
  if (notifications.length === 0) {
    return (
      <div className="absolute right-0 mt-2 w-72 bg-background border rounded-lg shadow-lg">
        <div className="p-4 text-center text-muted-foreground">
          No new notifications
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 mt-2 w-72 bg-background border rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
      {notifications.map((group) => (
        <div key={group.groupId} className="p-4 border-b hover:bg-accent/50">
          <div className="flex items-center gap-3">
            <UserAvatar 
              userId={group.data.actorId}
              name={group.data.actorName || ""}
              className="h-8 w-8"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{group.data.actorName}</div>
              <div className="text-sm text-muted-foreground">
                {group.type === "image-starred" && `⭐ Starred ${group.count} ${group.count === 1 ? 'image' : 'images'}`}
                {group.type === "comment-added" && `💬 Added ${group.count} ${group.count === 1 ? 'comment' : 'comments'}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(group.latestTime), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
