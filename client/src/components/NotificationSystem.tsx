
import { useState, useEffect } from "react";
import { NotificationBell } from "./NotificationBell";
import { NotificationDropdown } from "./NotificationDropdown";
import { useParams } from "react-router-dom";

export interface Notification {
  groupId: string;
  type: string;
  data: {
    actorId: string;
    actorName?: string;
    count?: number;
  };
  count: number;
  latestTime: string;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { slug } = useParams();

  const fetchNotifications = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data);
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
