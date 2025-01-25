
import { useState, useEffect } from "react";
import { NotificationBell } from "./NotificationBell";
import { NotificationDropdown } from "./NotificationDropdown";
import { useParams } from "wouter";

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

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { 
        method: 'POST',
        credentials: 'include'
      });
      // Re-fetch notifications to update state
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };
  const { slug } = useParams();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const response = await res.json();
      if (response.success && response.data) {
        setNotifications(Array.isArray(response.data) ? response.data : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="relative">
      <NotificationBell 
        notifications={notifications} 
        onClick={() => {
    const wasOpen = isDropdownOpen;
    setIsDropdownOpen(!wasOpen);
    if (!wasOpen) {
      markAllAsRead();
    }
  }} 
      />
      {isDropdownOpen && (
        <NotificationDropdown 
          notifications={notifications} 
          onClose={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
