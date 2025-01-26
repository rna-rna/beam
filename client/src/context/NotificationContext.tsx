import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import PusherClient from "pusher-js"; //Added back for Pusher functionality
import { useToast } from "@/hooks/use-toast"; //Added back for toast notifications


interface Notification {
  id: number;
  type: string;
  data: any;
  isSeen: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsSeen: (notificationId: number) => void;
  markAllAsSeen: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useUser();
  const { toast } = useToast(); //Added back for toast notifications

  useEffect(() => {
    if (!user) return;

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    fetchNotifications();


    // Initialize Pusher (restored from original code)
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

      // Show toast notification (restored from original code)
      toast({
        title: notif.type === "star" ? "New Star" :
          notif.type === "comment" ? "New Comment" :
            "New Notification",
        description: notif.data.actorName +
          (notif.type === "star" ? " starred your gallery" :
            notif.type === "comment" ? " commented on your gallery" :
              " interacted with your gallery"),
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [user, toast]);

  const unreadCount = notifications.filter(n => !n.isSeen).length;

  const markAsSeen = async (notificationId: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isSeen: true } : n)
    );
  };

  const markAllAsSeen = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isSeen: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsSeen, markAllAsSeen }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}