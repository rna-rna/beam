import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./NotificationBell";
import { useNotifications } from "@/context/NotificationContext";
import { UserAvatar } from "./UserAvatar";
import { formatDistanceToNow } from "@/lib/format-date";

import { useEffect } from "react";

export function NotificationBellDropdown() {
  const { notifications, markAllAsRead } = useNotifications();

  useEffect(() => {
    console.log('All notifications:', notifications);
    notifications.forEach(notif => {
      console.log('Notification type:', notif.type);
      console.log('Notification data:', notif.data);
      
      // Special logging for star notifications to debug color issue
      if (notif.type === 'star' || notif.type === 'image-starred') {
        console.log('Star notification color details:', {
          type: notif.type,
          actorColor: notif.data?.actorColor,
          actorName: notif.data?.actorName,
          hasColorField: notif.data?.hasOwnProperty('actorColor')
        });
      }
    });
  }, [notifications]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto custom-scrollbar" align="end">
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
          notifications.map((notif) => {
            // Make sure we extract color correctly for all notification types
            const { 
              actorName = "Someone", 
              actorAvatar = null, 
              actorColor = "#ccc", // Default color if not provided
              count = 0, 
              snippet = "", 
              galleryTitle = "Untitled Gallery" 
            } = notif.data || {};
            
            // Force debug to see what's in the data
            if (notif.type === 'star' || notif.type === 'image-starred') {
              console.log(`Extracted color for ${notif.type}:`, actorColor, 'from data:', notif.data);
              console.log('Full notification object:', notif);
            }

            let notificationText: JSX.Element | string = "";
            if (notif.type === "star" || notif.type === "image-starred") {
              notificationText = count
                ? `${actorName} starred ${count} image${count > 1 ? "s" : ""} in "${galleryTitle || "Untitled Gallery"}"`
                : `${actorName} starred an image in "${galleryTitle || "Untitled Gallery"}"`;
            } else if (notif.type === "comment" || notif.type === "comment-added") {
              notificationText = snippet
                ? `${actorName} commented: "${snippet}" in ${galleryTitle || "your gallery"}`
                : `${actorName} commented on ${galleryTitle || "your gallery"}`;
            } else if (notif.type === "reply" || notif.type === "comment-replied") {
              notificationText = snippet
                ? `${actorName} replied: "${snippet}" in ${galleryTitle || "your gallery"}`
                : `${actorName} replied to your comment in ${galleryTitle || "your gallery"}`;
            } else if (notif.type === "invite" || notif.type === "gallery-invite") {
              const gallerySlug = notif.data?.gallerySlug;
              notificationText = (
                <div className="flex flex-col gap-2">
                  <span>{`${actorName} invited you to "${galleryTitle || "Untitled Gallery"}"`}</span>
                  {notif.data?.gallerySlug && (
                    <a 
                      href={`/g/${notif.data.gallerySlug}`}
                      className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:opacity-90 w-fit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Project
                    </a>
                  )}
                </div>
              );
            } else if (notif.type === "image-uploaded") {
              notificationText = `${actorName} uploaded a new image to "${galleryTitle || "Untitled Gallery"}"`;
            } else {
              console.log("Unhandled notification type:", notif.type);
              notificationText = `${actorName} interacted with your gallery`;
            }

            return (
              <DropdownMenuItem
                key={notif.id}
                onSelect={() => {
                  const { type, data } = notif;

                  if ((type === 'comment' || type === 'comment-added') && data?.imageId) {
                    const url = `/g/${data.gallerySlug}?imageId=${data.imageId}#comment-${data.commentId}`;
                    window.location.href = url;
                  } else if ((type === 'star' || type === 'image-starred') && data?.imageId) {
                    const url = `/g/${data.gallerySlug}?imageId=${data.imageId}`;
                    window.location.href = url;
                  } else if (type === 'invite' || type === 'gallery-invite') {
                    const url = `/g/${data.gallerySlug}`;
                    window.location.href = url;
                  } else if (type === 'image-uploaded' && data?.gallerySlug) {
                    const url = `/g/${data.gallerySlug}`;
                    window.location.href = url;
                  } else {
                    console.warn("[No route found for notification]", { type, data });
                  }
                }}
                className={`px-4 py-3 cursor-pointer focus:bg-accent/50 ${!notif.isSeen ? "bg-accent/10" : ""}`}
              >
                <div className="flex gap-3">
                  <UserAvatar
                    size="sm"
                    name={actorName || "Unknown"}
                    imageUrl={actorAvatar}
                    color={actorColor || "#ccc"}
                    className="h-8 w-8"
                  />
                  {/* Debug info */}
                  {process.env.NODE_ENV === "development" && notif.type === 'image-starred' && (
                    <div className="absolute -top-1 -left-1 text-[6px] bg-black text-white px-0.5 rounded">
                      {actorColor || "no-color"}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`text-sm ${!notif.isSeen ? "font-medium" : ""}`}>
                      {notificationText}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt)) + ' ago' : 'Just now'}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}