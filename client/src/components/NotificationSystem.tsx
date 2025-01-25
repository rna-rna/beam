import { useState, useEffect } from "react";
import { NotificationBell } from "./NotificationBell";
import { NotificationDropdown } from "./NotificationDropdown";

export interface Notification {
  groupId: string;
  type: string;
  data: {
    actorId: string;
    actorName?: string;
    count?: number;
    imageId?: string;
    isStarred?: boolean;
    galleryId?: string;
  };
  count: number;
  latestTime: string;
  isSeen: boolean;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const response = await res.json();
      if (response.success && response.data) {
        setNotifications(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } else {
        setNotifications([]);
        setError('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { 
        method: 'POST',
        credentials: 'include'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="relative">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <NotificationBell 
        notifications={notifications} 
        onClick={() => {
          markAllAsRead();
        }} 
      />
    </div>
  );
}