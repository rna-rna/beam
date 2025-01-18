
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
  const { slug } = useParams();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const { data } = await res.json();
      setNotifications(data || []);
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
        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
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
