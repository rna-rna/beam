
import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from "socket.io-client";
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';
import { useUser } from '@clerk/clerk-react';

// Initialize socket
const socket = io(window.location.origin, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
  autoConnect: false,
  forceNew: true
});

export function NotificationSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

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
    // Connect to socket with auth
    if (user?.id) {
      socket.auth = { userId: user.id };
      socket.connect();

      // Join user-specific room
      socket.emit('join-user', user.id);
    }

    function handleNotification(newNotification) {
      queryClient.invalidateQueries(['/api/notifications']);
      
      const message = getNotificationMessage(newNotification);
      toast({
        title: 'New Notification',
        description: message,
      });
    }

    socket.on('notification', handleNotification);
    socket.on('image-starred', handleNotification);
    socket.on('comment-added', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('image-starred', handleNotification);
      socket.off('comment-added', handleNotification);
      socket.disconnect();
    };
  }, [queryClient, toast, user?.id]);

  const unseenCount = notifications.filter(n => !n.isSeen).length;

  function getNotificationMessage(notification) {
    switch (notification.type) {
      case 'image-starred':
        return `${notification.data?.actorId ? 'Someone' : 'A user'} starred an image`;
      case 'comment-added':
        return `New comment added to your image`;
      case 'image-uploaded':
        return `New image uploaded to gallery`;
      default:
        return 'New notification';
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell unseenCount={unseenCount} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <NotificationDropdown 
          notifications={notifications} 
          onMarkAllRead={() => markAllReadMutation.mutate()}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
