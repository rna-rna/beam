import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import PusherClient from "pusher-js";
import { useUser } from "@clerk/clerk-react";

interface Cursor {
  userId: string;
  x: number;
  y: number;
  userName?: string;
  userImageUrl?: string;
  color?: string;
}

interface ActiveUser {
  user_id: string;
  user_info?: {
    name?: string;
    image_url?: string;
    firstName?: string;
    lastName?: string;
    color?: string;
  };
}

interface GalleryRealtimeProps {
  slug: string | undefined;
  onCursorsUpdate?: (cursors: Cursor[]) => void;
  onActiveUsersUpdate?: (users: ActiveUser[]) => void;
  onGalleryUpdate?: (data: any) => void;
  onImageUpdate?: (data: any) => void;
}

// Initialize Socket.IO client
const socket: Socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

// Initialize Pusher client
const pusherClient = new PusherClient(import.meta.env.VITE_PUSHER_KEY || '', {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || '',
  authEndpoint: "/pusher/auth",
  forceTLS: true,
  encrypted: true,
  withCredentials: true,
  enabledTransports: ["ws", "wss", "xhr_streaming", "xhr_polling"],
  disabledTransports: [],
});

export const GalleryRealtime: React.FC<GalleryRealtimeProps> = ({
  slug,
  onCursorsUpdate,
  onActiveUsersUpdate,
  onGalleryUpdate,
  onImageUpdate,
}) => {
  const { user } = useUser();
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<Record<string, any>>({});

  // Socket.IO cursor tracking
  useEffect(() => {
    if (!slug || !user) return;

    const handleCursorUpdate = (data: { userId: string; x: number; y: number }) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId);
        return [...filtered, data];
      });
    };

    const handleCursorLeave = (userId: string) => {
      setCursors((prev) => prev.filter((c) => c.userId !== userId));
    };

    socket.emit("join-gallery", { gallerySlug: slug, userId: user.id });
    socket.on("cursor-update", handleCursorUpdate);
    socket.on("cursor-leave", handleCursorLeave);

    return () => {
      socket.emit("leave-gallery", { gallerySlug: slug, userId: user.id });
      socket.off("cursor-update", handleCursorUpdate);
      socket.off("cursor-leave", handleCursorLeave);
    };
  }, [slug, user]);

  // Pusher presence channel
  useEffect(() => {
    if (!slug || !user) return;

    const channelName = `presence-gallery-${slug}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      setPresenceMembers(members.members);
      const activeUsersList = Object.keys(members.members).map((userId) => ({
        user_id: userId,
        user_info: members.members[userId],
      }));
      setActiveUsers(activeUsersList);
    });

    channel.bind("pusher:member_added", (member: any) => {
      setPresenceMembers((prev) => ({
        ...prev,
        [member.id]: member.info,
      }));
      setActiveUsers((prev) => [
        ...prev,
        { user_id: member.id, user_info: member.info },
      ]);
    });

    channel.bind("pusher:member_removed", (member: any) => {
      setPresenceMembers((prev) => {
        const updated = { ...prev };
        delete updated[member.id];
        return updated;
      });
      setActiveUsers((prev) =>
        prev.filter((user) => user.user_id !== member.id)
      );
    });

    // Gallery update events
    if (onGalleryUpdate) {
      channel.bind("gallery-updated", onGalleryUpdate);
    }

    if (onImageUpdate) {
      channel.bind("image-updated", onImageUpdate);
    }

    return () => {
      setActiveUsers([]);
      setPresenceMembers({});
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.unsubscribe(channelName);
    };
  }, [slug, user, onGalleryUpdate, onImageUpdate]);

  // Update parent components
  useEffect(() => {
    if (onCursorsUpdate) {
      onCursorsUpdate(cursors);
    }
  }, [cursors, onCursorsUpdate]);

  useEffect(() => {
    if (onActiveUsersUpdate) {
      onActiveUsersUpdate(activeUsers);
    }
  }, [activeUsers, onActiveUsersUpdate]);

  // Track mouse movement for cursor sharing
  useEffect(() => {
    if (!slug || !user) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      
      socket.emit("cursor-move", {
        gallerySlug: slug,
        userId: user.id,
        x,
        y,
        userName: user.fullName || user.username,
        userImageUrl: user.imageUrl,
      });
    };

    const handleMouseLeave = () => {
      socket.emit("cursor-leave", {
        gallerySlug: slug,
        userId: user.id,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [slug, user]);

  return null; // This component doesn't render anything, it just handles real-time logic
};

/**
 * Hook to get real-time connection status
 */
export const useRealtimeStatus = () => {
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [pusherConnected, setPusherConnected] = useState(false);

  useEffect(() => {
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    pusherClient.connection.bind("connected", () => setPusherConnected(true));
    pusherClient.connection.bind("disconnected", () => setPusherConnected(false));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return { socketConnected, pusherConnected };
};