import React from 'react';
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from "socket.io-client";
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';

// Initialize socket
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

export function NotificationSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications;
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to mark notifications as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/notifications']);
    }
  });

  React.useEffect(() => {
    socket.on('notification', (newNotification) => {
      queryClient.invalidateQueries(['/api/notifications']);
      toast({
        title: 'New Notification',
        description: getNotificationMessage(newNotification),
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [queryClient, toast]);

  const unseenCount = notifications.filter(n => !n.isSeen).length;

  function getNotificationMessage(notification) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NotificationBell unseenCount={unseenCount} />
      </DropdownMenuTrigger>
      <NotificationDropdown 
        notifications={notifications} 
        onMarkAllRead={() => markAllReadMutation.mutate()}
      />
    </DropdownMenu>
  );
}