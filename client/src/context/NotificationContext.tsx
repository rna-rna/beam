
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import PusherClient from "pusher-js";

export interface Notification {
  id: number;
  type: string;
  data: any;
  isSeen: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", {
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }

    fetchNotifications();

    // Initialize Pusher
    const pusher = new PusherClient(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      authEndpoint: "/pusher/auth",
      forceTLS: true,
      encrypted: true,
      auth: {
        headers: {
          "Cache-Control": "no-cache",
        }
      }
    });

    // Subscribe to private user channel
    const channel = pusher.subscribe(`private-user-${user.id}`);
    console.log("Subscribing to notifications channel:", `private-user-${user.id}`);

    channel.bind("notification", (notif: Notification) => {
      console.log("Received notification:", notif);
      setNotifications(prev => {
        const idx = prev.findIndex(n => n.id === notif.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = notif;
          return updated;
        }
        return [notif, ...prev];
      });

      let title = "New Notification";
      let description = "";

      switch (notif.type) {
        case "star":
          title = "New Star";
          description = `${notif.data.actorName} starred "${notif.data.galleryTitle || 'Untitled Gallery'}"`;
          break;
        case "comment":
        case "comment-added":
          title = "New Comment";
          description = `${notif.data.actorName} commented: "${notif.data.snippet}" in "${notif.data.galleryTitle || 'Untitled Gallery'}"`;
          break;
        case "gallery-invite":
          title = "New Gallery Invite";
          description = `${notif.data.actorName} invited you to "${notif.data.galleryTitle || 'Untitled Gallery'}" with ${notif.data.role} access`;
          break;
        case "comment-reply":
          title = "New Reply";
          description = `${notif.data.actorName} replied to your comment`;
          break;
        default:
          description = `${notif.data.actorName} interacted with "${notif.data.galleryTitle || 'Untitled Gallery'}"`;
      }

      toast({
        title,
        description,
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [user, toast]);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include"
      });
      setNotifications(prev => prev.map(n => ({ ...n, isSeen: true })));
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
