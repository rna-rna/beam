
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Button } from './ui/button';
import type { Notification } from '@/types/gallery';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export function NotificationDropdown({ notifications, onMarkAllRead }: NotificationDropdownProps) {
  function getNotificationMessage(notification: Notification) {
    switch (notification.type) {
      case 'image-starred':
        return 'Someone starred your image';
      case 'comment-added':
        return 'New comment on your image';
      default:
        return 'New notification';
    }
  }

  return (
    <DropdownMenuContent align="end" className="w-80">
      {notifications.length === 0 ? (
        <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
      ) : (
        <>
          {notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className={notification.isSeen ? 'opacity-60' : ''}>
              <div className="flex flex-col gap-1">
                <div>{getNotificationMessage(notification)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem 
            className="justify-center text-sm"
            onClick={onMarkAllRead}
          >
            Mark all as read
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
}
