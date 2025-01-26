
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { io } from "socket.io-client";
import { useToast } from '@/hooks/use-toast';

// Initialize socket
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

interface Notification {
  id: number;
  type: string;
  data: any;
  isSeen: boolean;
  createdAt: string;
}

export function NotificationSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(socket.connected);

  const { data: notifications = [] } = useQuery<Notification[]>({
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

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to notification system');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from notification system');
    });

    socket.on('notification', (newNotification: Notification) => {
      queryClient.invalidateQueries(['/api/notifications']);
      toast({
        title: 'New Notification',
        description: getNotificationMessage(newNotification),
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification');
    };
  }, [queryClient, toast]);

  const unseenCount = notifications.filter(n => !n.isSeen).length;

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {unseenCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id}>
                {getNotificationMessage(notification)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem 
              className="justify-center text-sm"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
