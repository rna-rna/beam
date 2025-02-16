import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getR2Image } from "@/lib/r2";
import { io } from 'socket.io-client';
import { default as GalleryActions } from '@/components/GalleryActions';

// Initialize Socket.IO client
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Grid,
  LayoutGrid,
  MessageSquare,
  Star,
  CheckCircle,
  Loader2,
  Share,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PencilRuler,
  Eye,
  EyeOff,
  Lock,
  SquareScissors,
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import LightboxDialogContent from "@/components/dialog/LightboxDialogContent";
import { StarredUsersFilter } from "@/components/StarredUsersFilter";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useDropzone } from "react-dropzone";
import { MobileGalleryView } from "@/components/MobileGalleryView";
import type {
  Image,
  Gallery as GalleryType,
  Comment,
  Annotation,
  ImageOrPending,
  PendingImage,
} from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ShareModal } from "@/components/ShareModal";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { Toggle } from "@/components/ui/toggle";
import { useAuth } from "@clerk/clerk-react";
import { CommentModal } from "@/components/CommentModal";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/LoginModal";
import { useUpload, UploadProvider } from "@/context/UploadContext";
import { StarredAvatars } from "@/components/StarredAvatars";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { SignUpModal } from "@/components/SignUpModal";
import PusherClient from "pusher-js";
import { nanoid } from "nanoid";
import { CursorOverlay } from "@/components/CursorOverlay";

// Initialize Pusher client
const pusherClient = new PusherClient(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  appId: import.meta.env.VITE_PUSHER_APP_ID,
  authEndpoint: "/pusher/auth",
  forceTLS: true,
  encrypted: true,
  withCredentials: true,
  enabledTransports: ["ws", "wss", "xhr_streaming", "xhr_polling"],
  disabledTransports: [],
});

// Validate required environment variables
if (
  !import.meta.env.VITE_PUSHER_KEY ||
  !import.meta.env.VITE_PUSHER_CLUSTER ||
  !import.meta.env.VITE_PUSHER_APP_ID
) {
  console.error("Missing required Pusher environment variables");
}

interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

import { Helmet } from "react-helmet";

export default function Gallery({
  slug: propSlug,
  title,
  onHeaderActionsChange,
}: GalleryProps) {
  // URL Parameters and Global Hooks first
  const params = useParams();
  const slug = propSlug || params?.slug;

  // Query must be declared before being used in useMemo
  const {
    data: gallery,
    isLoading: isGalleryLoading,
    error,
  } = useQuery<GalleryType>({
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      // ... existing query logic ...

    },
    enabled: !!slug,
  });

  const processedImages = useMemo(() => {
    if (!gallery?.images) return [];
    return gallery.images
      .filter((image) => image && image.url)
      .map((image) => ({
        ...image,
        displayUrl: getR2Image(image, "thumb"),
        aspectRatio:
          image.width && image.height ? image.width / image.height : 1.33,
      }));
  }, [gallery?.images, getR2Image]);

  const beamOverlayTransform = "l_beam-bar_q6desn,g_center,x_0,y_0";
  const [presenceMembers, setPresenceMembers] = useState<{
    [key: string]: any;
  }>({});
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<{
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
    lastActive: number;
  }[]>([]);
  const [myColor, setMyColor] = useState("#ccc");
  const { session } = useClerk();
  const { user } = useUser();

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!user || !myColor || !slug) return;

    const cursorData = {
      id: user.id,
      name: user.firstName || user.username || 'Anonymous',
      color: myColor,
      x: event.clientX,
      y: event.clientY,
      lastActive: Date.now(),
      gallerySlug: slug
    };

    socket.emit('cursor-update', cursorData);
  }, [user, myColor, socket, slug]);

  // Fetch user color when component mounts
  useEffect(() => {
    if (!user) return;

    async function fetchMyColor() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load cached user data");
        const data = await res.json();
        console.log("Fetched /api/user/me data:", data);
        setMyColor(data.color || "#ccc");
      } catch (err) {
        console.error("Could not load cached user data:", err);
      }
    }

    fetchMyColor();
  }, [user]);

  // Refresh Clerk session if expired
  useEffect(() => {
    if (session?.status === "expired") {
      session
        .refresh()
        .then(() => console.log("Clerk session refreshed successfully"))
        .catch((error) =>
          console.error("Failed to refresh Clerk session:", error),
        );
    }
  }, [session]);

  // Log active users when they change
  useEffect(() => {
    console.log(
      "Active Users:",
      activeUsers.map((user) => ({
        userId: user.userId,
        name: user.name,
        avatar: user.avatar,
        lastActive: user.lastActive,
      })),
    );
  }, [activeUsers]);

  // Pusher presence channel subscription
  // Socket.IO connection handlers
  useEffect(() => {
    if (!user || !slug) {
      // Reset presence states when not in a gallery
      setActiveUsers([]);
      setPresenceMembers({});
      setCursors([]);
      return;
    }

    const joinGallery = () => {
      if (slug && socket.connected) {
        socket.emit('join-gallery', slug);
        console.log('Joined gallery room:', slug);
      }
    };

    // Join immediately if connected
    joinGallery();

    socket.on('connect', () => {
      console.log('Connected to Socket.IO:', {
        id: socket.id,
        transport: socket.io.engine.transport.name,
        hostname: window.location.host,
        protocol: window.location.protocol,
        readyState: 'CONNECTED'
      });
      joinGallery();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', {
        message: error.message,
        description: error.description,
        stack: error.stack,
        context: {
          transport: socket.io?.engine?.transport?.name,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          readyState: socket.connected ? 'CONNECTED' : 'DISCONNECTED'
        }
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO:', {
        reason,
        wasConnected: socket.connected,
        id: socket.id
      });
      // Clear presence states on disconnect
      setActiveUsers([]);
      setPresenceMembers({});
      setCursors([]);
    });

    socket.on('cursor-update', (data) => {
      console.log("[cursor-update]", "Received data:", {
        ...data,
        timestamp: new Date().toISOString(),
        currentUser: user?.id
      });

      // Update cursors
      setCursors((prev) => {
        const otherCursors = prev.filter((cursor) => cursor.id !== data.id);
        return [...otherCursors, { ...data, lastActive: Date.now() }];
      });

      // Update active users
      setActiveUsers((prev) => {
        const withoutUser = prev.filter(u => u.userId !== data.id);
        const isUserPresent = prev.some(u => u.userId === data.id);

        if (!isUserPresent) {
          return [...withoutUser, {
            userId: data.id,
            name: data.name,
            avatar: data.imageUrl,
            color: data.color,
            lastActive: Date.now()
          }];
        }

        return prev.map(u => 
          u.userId === data.id 
            ? { ...u, lastActive: Date.now() }
            : u
        );
      });
    });

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('cursor-update');
      window.removeEventListener('mousemove', handleMouseMove);
      if (slug) {
        socket.emit('leave-gallery', slug);
      }
      // Reset all presence states in cleanup
      setActiveUsers([]);
      setPresenceMembers({});
      setCursors([]);
    };
  }, [user, socket, handleMouseMove, slug]); // Added handleMouseMove which includes myColor dependency

  // Cleanup inactive cursors
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        return prev.filter((cursor) => (now - cursor.lastActive) < 15000);
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!slug || !user) return;

    const channelName = `presence-gallery-${slug}`;
    console.log("Attempting to subscribe to channel:", channelName);

    // Cleanup any existing subscription first
    if (pusherClient.channel(channelName)) {
      console.log("Cleaning up existing subscription to:", channelName);
      pusherClient.unsubscribe(channelName);
    }

    const channel = pusherClient.subscribe(channelName);

    // Handle real-time events
    channel.bind("image-uploaded", (data: { imageId: number; url: string }) => {
      console.log("New image uploaded:", data);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    });

    channel.bind("image-starred", (data: { imageId: number; isStarred: boolean; userId: string }) => {
      console.log("Image starred/unstarred:", data);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      queryClient.invalidateQueries([`/api/images/${data.imageId}/stars`]);
    });

    channel.bind("comment-added", (data: { imageId: number; content: string }) => {
      console.log("New comment added:", data);
      queryClient.invalidateQueries([`/api/images/${data.imageId}/comments`]);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    });

    console.log("Channel details:", {
      name: channel.name,
      state: channel.state,
      subscribed: channel.subscribed,
    });

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      const activeMembers: any[] = [];
      const currentUserId = user?.id;

      members.each((member: any) => {
        const userInfo = member.info || member.user_info || {};

        // Skip if this is the current user
        if (member.id === currentUserId) return;

        console.log("Processing member:", member);

        activeMembers.push({
          userId: member.id,
          name: userInfo.name || "Anonymous",
          avatar: userInfo.avatar || "/fallback-avatar.png",
          lastActive: new Date().toISOString(),
        });
      });

      console.log("Subscription succeeded:", {
        channelName: channel.name,
        totalMembers: members.count,
        currentUserId: members.myID,
        activeMembers,
      });

      setPresenceMembers(members.members);
      setActiveUsers(activeMembers);
    });

    channel.bind("pusher:subscription_error", (status: any) => {
      console.error("Subscription error:", {
        status,
        channel: channel.name,
        state: channel.state,
        responseStatus: status?.status,
        responseText: status?.error,
        timestamp: new Date().toISOString(),
      });

      if (status?.status === 200) {
        console.log("Unexpected HTML Response from Auth:", status.error);
      }
    });

    channel.bind("pusher:member_added", (member: any) => {
      console.log("Member added:", member);

      // Skip if this is the current user
      if (member.id === user?.id) return;

      setActiveUsers((prev) => {
        const isPresent = prev.some((user) => user.userId === member.id);
        if (isPresent) return prev;

        const userInfo = member.info || {};
        return [
          ...prev,
          {
            userId: member.id,
            name: userInfo.name || "Anonymous",
            avatar: userInfo.avatar || "/fallback-avatar.png",
            color: userInfo.color || "#ccc",
            lastActive: new Date().toISOString(),
          },
        ];
      });
    });

    channel.bind("pusher:member_removed", (member: any) => {
      console.log("Member removed:", {
        id: member.id,
        channelData: member,
      });
      setActiveUsers((prev) =>
        prev.filter((user) => user.user_id !== member.id),
      );
    });

    // Clear active users when unmounting or changing galleries
    return () => {
      console.log("Cleaning up Pusher subscription for:", channelName);
      setActiveUsers([]); // Clear active users immediately
      setPresenceMembers({}); // Clear presence members
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.unsubscribe(channelName); // Double-check unsubscription
    };
  }, [slug, user]);
  const { toast } = useToast();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0,
  );

  const handleGuestUpload = async (files: File[]) => {
    if (guestGalleryCount >= 1) {
      window.location.href = "/sign-up";
      return;
    }
    console.log("Uploading guest gallery with guestUpload flag...");
    setGuestGalleryCount(1);
    sessionStorage.setItem("guestGalleryCount", "1");

    if (files?.length) {
      // uploadMutation.mutate(files); // Removed
    }
  };

  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { isDark } = useTheme();

  const toggleGridView = () => {
    setIsMasonry(!isMasonry);
  };

  // State Management
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [scale, setScale] = useState(100);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [imageDimensions, setImageDimensions] =
    useState<ImageDimensions | null>(null);
  const [showFilename, setShowFilename] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLowResLoading, setIsLowResLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(
    new Set(),
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isMasonry, setIsMasonry] = useState(true);
  const [showWithComments, setShowWithComments] = useState(false);
  const [userRole, setUserRole] = useState<string>("Viewer");
  const [images, setImages] = useState<ImageOrPending[]>([]);

  // Load server images
  useEffect(() => {
    if (gallery?.images) {
      setImages((prev) => {
        // Only keep actively uploading items
        const uploading = prev.filter(
          (img) => "localUrl" in img && img.status === "uploading",
        );
        return [...uploading, ...gallery.images];
      });
    }
  }, [gallery?.images]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const masonryRef = useRef<any>(null);

  const combinedImages = useMemo(() => {
    return images;
  }, [images]);

  useEffect(() => {
    if (slug) {
      fetch(`/api/galleries/${slug}/permissions`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Permissions API Response:", {
            data,
            currentUserEmail: user?.primaryEmailAddress?.emailAddress,
            foundUser: data.users.find(
              (u) => u.email === user?.primaryEmailAddress?.emailAddress,
            ),
            allEmails: data.users.map((u) => u.email),
          });

          const currentUserRole =
            data.users.find(
              (u) => u.email === user?.primaryEmailAddress?.emailAddress,
            )?.role || "Viewer";

          console.log("Role Assignment:", {
            assignedRole: currentUserRole,
            userEmail: user?.primaryEmailAddress?.emailAddress,
            isOwner: data.users.some(
              (u) =>
                u.email === user?.primaryEmailAddress?.emailAddress &&
                u.role === "Editor",
            ),
          });

          setUserRole(currentUserRole);
        })
        .catch((error) => console.error("Failed to load permissions:", error));
    }
  }, [slug, user]);
  const [isOpenShareModal, setIsOpenShareModal] = useState(false);
  const [isPrivateGallery, setIsPrivateGallery] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Title update mutation
  const titleUpdateMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${slug}/title`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error("Failed to update title");
      }

      return res.json();
    },
    onMutate: async (newTitle) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/galleries/${slug}`] });
      await queryClient.cancelQueries({ queryKey: ["/api/galleries"] });

      // Snapshot the previous values
      const previousGallery = queryClient.getQueryData([
        `/api/galleries/${slug}`,
      ]);
      const previousGalleries = queryClient.getQueryData(["/api/galleries"]);

      // Optimistically update both caches
      queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => ({
        ...old,
        title: newTitle,
      }));

      queryClient.setQueryData(["/api/galleries"], (old: any) => {
        if (!old) return old;
        return old.map((gallery: any) =>
          gallery.slug === slug ? { ...gallery, title: newTitle } : gallery,
        );
      });

      return { previousGallery, previousGalleries };
    },
    onError: (err, newTitle, context) => {
      // Revert to previous values on error
      if (context?.previousGallery) {
        queryClient.setQueryData(
          [`/api/galleries/${slug}`],
          context.previousGallery,
        );
      }
      if (context?.previousGalleries) {
        queryClient.setQueryData(["/api/galleries"], context.previousGalleries);
      }
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate both queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
    },
  });

  // Title update handler
  const handleTitleUpdate = async (newTitle: string) => {
    try {
      await titleUpdateMutation.mutateAsync(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  // Update gallery query reference
  useQuery({
    onSuccess: (data) => {
      console.log("Gallery Data:", {
        galleryId: data?.id,
        imageCount: data?.images?.length,
        title: data?.title,
        slug: data?.slug,
        isPublic: data?.isPublic,
      });

      console.log(
        "Image Details:",
        data?.images?.map((image) => ({
          id: image.id,
          originalFilename: image.originalFilename,
          url: image.url,
          width: image.width,
          height: image.height,
          publicId: image.publicId,
          stars: image.stars?.length,
          userStarred: image.userStarred,
          commentCount: image.commentCount,
        })),
      );
    },
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      console.log("Starting gallery fetch for slug:", slug, {
        hasToken: !!(await getToken()),
        timestamp: new Date().toISOString(),
      });

      const token = await getToken();
      const headers: HeadersInit = {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/galleries/${slug}`, {
        headers,
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Gallery fetch failed:", {
          status: res.status,
          statusText: res.statusText,
        });
        if (res.status === 403) {
          throw new Error("This gallery is private");
        }
        if (res.status === 404) {
          throw new Error("Private Gallery");
        }
        throw new Error("Failed to fetch gallery");
      }

      const data = await res.json();
      console.log("Gallery API Response:", {
        status: res.status,
        ok: res.ok,
        galleryId: data?.id,
        title: data?.title,
        slug: data?.slug,
        imageCount: data?.images?.length,
        sampleImage: data?.images?.[0]
          ? {
              id: data.images[0].id,
              originalFilename: data.images[0].originalFilename,
              url: data.images[0].url,
              width: data.images[0].width,
              height: data.images[0].height,
            }
          : null,
        timestamp: new Date().toISOString(),
      });
      console.log("Gallery API Response:", {
        status: res.status,
        ok: res.ok,
        galleryId: data?.id,
        title: data?.title,
        slug: data?.slug,
        imageCount: data?.images?.length,
        sampleImage: data?.images?.[0]
          ? {
              id: data.images[0].id,
              originalFilename: data.images[0].originalFilename,
              url: data.images[0].url,
              width: data.images[0].width,
              height: data.images[0].height,
            }
          : null,
        timestamp: new Date().toISOString(),
      });

      // Validate required image fields
      if (data?.images) {
        const missingFields = data.images.some(
          (img: any) => !img.originalFilename || !img.url || !img.id,
        );

        if (missingFields) {
          console.error(
            "Invalid image data detected:",
            data.images.filter(
              (img: any) => !img.originalFilename || !img.url || !img.id,
            ),
          );
        }
      }

      if (!data) {
        throw new Error("Gallery returned null or undefined");
      }

      if (!data.images || !Array.isArray(data.images)) {
        throw new Error("Invalid gallery data format");
      }

      return data;
    },
    enabled: !!slug,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: (err) => {
      console.error("Gallery query error:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load gallery",
        variant: "destructive",
      });
    },
  });

  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  useEffect(() => {
    setSelectedImage(gallery?.images?.[selectedImageIndex] ?? null);
  }, [selectedImageIndex, gallery?.images]);

  const { data: annotations = [] } = useQuery<Annotation[]>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });

  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    error: commentsError,
  } = useQuery<Comment[]>({
    queryKey: [`/api/images/${selectedImage?.id}/comments`],
    enabled: !!selectedImage?.id,
    onSuccess: (data) => {
      console.log("Fetched comments:", data);
    },
    onError: (err) => {
      console.error("Failed to fetch comments:", err);
    },
    select: (data) => {
      return data.map((comment) => ({
        ...comment,
        author: {
          id: comment.userId || "unknown",
          username: comment.userName || "Unknown User", 
          imageUrl: comment.userImageUrl || undefined,
          color: comment.color || '#ccc'
        },
      }));
    },
  });

  // Track gallery views
  const hasRecordedViewRef = useRef(false);
  useEffect(() => {
    if (gallery?.slug && user && !hasRecordedViewRef.current) {
      hasRecordedViewRef.current = true;
      fetch(`/api/galleries/${gallery.slug}/view`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      })
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to record gallery view", res.status, res.statusText);
          } else {
            console.log("Gallery view recorded for", gallery.slug);
          }
        })
        .catch((err) => {
          console.error("Error recording gallery view:", err);
        });
    }
  }, [gallery?.slug, user]);

  // Define mutations first
  const toggleStarMutation = useMutation({
    mutationFn: async ({
      imageId,
      isStarred,
    }: {
      imageId: number;
      isStarred: boolean;
    }) => {
      if (
        !Number.isInteger(Number(imageId)) ||
        imageId.toString().startsWith("pending-")
      ) {
        return;
      }
      const token = await getToken();
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: isStarred ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const result = await res.json();
      if (!res.ok || result?.success === false) {
        throw new Error(result.message || "Failed to update star status");
      }

      return { ...result, imageId };
    },
    onMutate: async ({ imageId, isStarred }) => {
      await queryClient.cancelQueries([`/api/galleries/${slug}`]);
      await queryClient.cancelQueries([`/api/images/${imageId}/stars`]);
      const previousGallery = queryClient.getQueryData([
        `/api/galleries/${slug}`,
      ]);
      const previousStars = queryClient.getQueryData([
        `/api/images/${imageId}/stars`,
      ]);

      // Update Lightbox Image (if open)
      setSelectedImage((prev) =>
        prev?.id === imageId ? { ...prev, userStarred: !isStarred } : prev,
      );

      // Update Gallery Grid
      queryClient.setQueryData([`/api/galleries/${slug}`], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          images: oldData.images.map((image: any) =>
            image.id === imageId
              ? { ...image, userStarred: !isStarred }
              : image,
          ),
        };
      });

      // Update stars data
      queryClient.setQueryData([`/api/images/${imageId}/stars`], (old: any) => {
        if (!old) return { success: true, data: [] };
        const updatedData = isStarred
          ? old.data.filter((star: any) => star.userId !== user?.id)
          : [
              ...old.data,
              {
                userId: user?.id,
                imageId,
                user: {
                  firstName: user?.firstName,
                  lastName: user?.lastName,
                  imageUrl: user?.imageUrl,
                },
              },
            ];
        return { ...old, data: updatedData };
      });

      return { previousGallery, previousStars };
    },
    onError: (err, variables, context) => {
      if (context?.previousGallery) {
        queryClient.setQueryData(
          [`/api/galleries/${slug}`],
          context.previousGallery,
        );
      }
      toast({
        title: "Error",
        description: "Failed to update star status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
  });

  const reorderImageMutation = useMutation({
    mutationFn: async (newOrder: number[]) => {
      const res = await fetch(`/api/galleries/${slug}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder images");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Success",
        description: "Image order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update image order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteImagesMutation = useMutation({
    mutationFn: async (imageIds: number[]) => {
      const response = await fetch(`/api/galleries/${slug}/images/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      if (!response.ok) throw new Error("Failed to delete images");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        [`/api/galleries/${slug}`],
        (oldData: GalleryType | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            images: oldData.images.filter(
              (image: Image) => !variables.includes(image.id),
            ),
          };
        },
      );

      setSelectedImages([]);
      setSelectMode(false);

      toast({
        title: "Success",
        description: "Selected images deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete images. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
    queryClient.refetchQueries({ queryKey: [`/api/galleries/${slug}`] });
  };

  const createCommentMutation = useMutation({
    mutationFn: async ({
      imageId,
      content,
      x,
      y,
    }: {
      imageId: number;
      content: string;
      x: number;
      y: number;
    }) => {
      const token = await getToken();
      const res = await fetch(`/api/images/${imageId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          xPosition: x,
          yPosition: y,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to create comment");
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${selectedImage?.id}/comments`],
      });
      setNewCommentPos(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add comment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${slug}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (!res.ok) {
        throw new Error("Failed to update visibility");
      }

      return res.json();
    },
    onSuccess: () => {
      // Force cache refresh
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
      toast({
        title: "Success",
        description: "Gallery visibility updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { addBatch, updateBatchProgress, completeBatch } = useUpload();

  const uploadSingleFile = async (file: File, tmpId: string) => {
    const addBatchId = nanoid();
    addBatch(addBatchId, file.size, 1);

    try {
      const token = await getToken();
      const response = await fetch(`/api/galleries/${slug}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: [
            {
              name: file.name,
              type: file.type,
              size: file.size,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload URL");

      const { urls } = await response.json();
      const { signedUrl, publicUrl, imageId } = urls[0];

      // Immediately update the placeholder with the real ID
      setImages((prev) =>
        prev.map((img) =>
          img.id === tmpId
            ? {
                ...img,
                id: imageId,
                status: "uploading",
                progress: 0,
              }
            : img,
        ),
      );

      // Upload to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const progress = (ev.loaded / ev.total) * 100;
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageId ? { ...img, progress } : img,
              ),
            );
            updateBatchProgress(addBatchId, ev.loaded - ev.total);
          }
        };

        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.send(file);
      });

      // Load the uploaded image to get final dimensions
      const img = new Image();
      img.onload = () => {
        // Update status to finalizing
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? {
                  ...(img as PendingImage),
                  status: "finalizing",
                  progress: 100,
                }
              : img,
          ),
        );

        // Add retry logic with delay
        const pollForFinalImage = async (attempt = 0, maxAttempts = 5) => {
          if (attempt >= maxAttempts) {
            console.warn("Max polling attempts reached waiting for image", {
              imageId,
              attempts: attempt,
            });
            // Keep the current state but mark as error
            setImages((prev) =>
              prev.map((item) =>
                item.id === imageId
                  ? { ...item, status: "error", _status: "error" }
                  : item,
              ),
            );
            return;
          }

          // Wait between attempts
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            await queryClient.invalidateQueries([`/api/galleries/${slug}`]);
            const galleryData = await queryClient.getQueryData([
              `/api/galleries/${slug}`,
            ]);

            // Check if image exists in gallery data
            const serverImage = galleryData?.images?.find(
              (img) => img.id === imageId,
            );
            if (serverImage) {
              setImages((prev) =>
                prev.map((item) =>
                  item.id === imageId
                    ? {
                        ...serverImage,
                        status: "complete",
                        _status: "complete",
                      }
                    : item,
                ),
              );
              return;
            }

            // If not found, continue polling
            await pollForFinalImage(attempt + 1, maxAttempts);
          } catch (error) {
            console.error("Error polling for image:", error);
            await pollForFinalImage(attempt + 1, maxAttempts);
          }
        };

        // Start polling after image is uploaded
        pollForFinalImage().finally(() => {
          completeBatch(addBatchId, true);
        });
      };
      img.src = publicUrl;

      completeBatch(addBatchId, true);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    } catch (error) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === tmpId
            ? { ...(img as PendingImage), status: "error", progress: 0 }
            : img,
        ),
      );
      completeBatch(addBatchId, false);
      console.error("Upload failed:", error);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      acceptedFiles.forEach((file) => {
        const tmpId = nanoid();
        const localUrl = URL.createObjectURL(file);

        const imageEl = new Image();
        imageEl.onload = () => {
          const width = imageEl.naturalWidth;
          const height = imageEl.naturalHeight;

          const newItem: ImageOrPending = {
            id: tmpId,
            localUrl,
            status: "uploading",
            progress: 0,
            width,
            height,
          };

          // Add new uploads at the end to maintain order
          setImages((prev) => [...prev, newItem]);
          uploadSingleFile(file, tmpId);
        };
        imageEl.src = localUrl;
      });
    },
    [setImages, uploadSingleFile],
  );

  // Modify the useDropzone configuration to disable click
  const canUpload = userRole === 'owner' || userRole === 'Edit';
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    disabled: !canUpload || isUploading || selectMode || selectedImageIndex >= 0,
    noClick: true,
    noKeyboard: true,
  });

  // Memoized Values
  const breakpointCols = useMemo(
    () => ({
      default: Math.max(1, Math.floor(6 * (100 / scale))),
      2560: Math.max(1, Math.floor(6 * (100 / scale))),
      1920: Math.max(1, Math.floor(5 * (100 / scale))),
      1536: Math.max(1, Math.floor(4 * (100 / scale))),
      1024: Math.max(1, Math.floor(3 * (100 / scale))),
      768: Math.max(1, Math.min(5, Math.floor(3 * (100 / scale)))),
      640: Math.max(1, Math.min(5, Math.floor(2 * (100 / scale)))),
      480: Math.max(1, Math.min(5, Math.floor(2 * (100 / scale)))),
    }),
    [scale],
  );

  // Preload image function
  const preloadImage = useCallback((image: Image, imageId: number) => {
    const img = new Image();
    img.src = getR2Image(image, "thumb");
    img.onload = () => {
      setPreloadedImages((prev) => new Set([...Array.from(prev), imageId]));
    };
  }, []);

  // Reflow Masonry layout when images or uploads change
  useEffect(() => {
    if (masonryRef.current?.layout) {
      masonryRef.current.layout();
    }
  }, [gallery?.images, images]);

  // Preload images when gallery data is available
  useEffect(() => {
    if (gallery?.images) {
      gallery.images.forEach((image) => {
        if (!preloadedImages.has(image.id)) {
          preloadImage(image, image.id);
        }
      });
    }
  }, [gallery?.images, preloadImage, preloadedImages]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Gallery link copied to clipboard",
    });
  };

  const handleDownloadAll = async () => {
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of all images...",
      });

      const zip = new JSZip();
      const imagePromises = gallery!.images.map(async (image, index) => {
        const response = await fetch(getR2Image(image)); // Use original unoptimized URL for downloads
        const blob = await response.blob();
        const extension = image.url.split(".").pop() || "jpg";
        zip.file(`image-${index + 1}.${extension}`, blob);
      });

      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${gallery!.title || "gallery"}-images.zip`);

      toast({
        title: "Success",
        description: "Images downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download images. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleStarredToggle = () => {
    setShowStarredOnly(!showStarredOnly);
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedImages([]);
    }
    setSelectMode(!selectMode);
  };

  const handleImageSelect = (imageId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (!selectMode) return;

    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );
  };

  const handleDeleteSelected = () => {
    deleteImagesMutation.mutate(selectedImages);
  };

  const handleDownloadSelected = async (quality: 'original' | 'optimized' = 'original') => {
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of selected images...",
      });

      const zip = new JSZip();
      const imagePromises = selectedImages.map(async (imageId) => {
        const image = gallery!.images.find((img) => img.id === imageId);
        if (!image) return;

        const imageUrl = quality === 'original' ? getR2Image(image) : getR2Image(image, 'thumb');
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const extension = image.url.split(".").pop() || "jpg";
        zip.file(`image-${imageId}.${extension}`, blob);
      });

      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `selected-images-${quality}.zip`);

      toast({
        title: "Success",
        description: `Selected images downloaded successfully (${quality} quality)`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditSelected = () => {
    // Implement edit functionality for selected images
    toast({
      title: "Coming Soon",
      description: "Batch editing will be available soon!",
    });
  };


  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    // Allow Escape key regardless of focus state
    if (e.key === "Escape" && selectMode) {
      e.preventDefault();
      setSelectedImages([]);
      setSelectMode(false);
      return;
    }

    // Skip other shortcuts if input/textarea is focused
    if (document.activeElement instanceof HTMLInputElement || 
        document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectMode]);

  useEffect(() => {
    if (selectedImageIndex >= 0) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Skip keyboard shortcuts if any input/textarea is focused
        if (document.activeElement instanceof HTMLInputElement || 
            document.activeElement instanceof HTMLTextAreaElement) {
          return;
        }

        if (!gallery?.images?.length) return;
        if (e.key === "ArrowLeft") {
          setSelectedImageIndex((prev) =>
            prev <= 0 ? gallery.images.length - 1 : prev - 1,
          );
        } else if (e.key === "ArrowRight") {
          setSelectedImageIndex((prev) =>
            prev >= gallery.images.length - 1 ? 0 : prev + 1,
          );
        } else if (
          selectedImage &&
          (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "s")
        ) {
          toggleStarMutation.mutate({
            imageId: selectedImage.id,
            isStarred: selectedImage.userStarred,
          });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);    }
  }, [
    selectedImageIndex,
    gallery?.images?.length,
    selectedImage,
    toggleStarMutation,
  ]);

  useEffect(() => {
    const controls = renderGalleryControls();
    onHeaderActionsChange?.(controls);
  }, [onHeaderActionsChange, renderGalleryControls]);

  if (isPrivateGallery) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <Alert
          variant="destructive"
          className="w-full max-w-md border-destructive"
        >
          <Lock className="h-12 w-12 mb-2" />
          <Lock className="h-12 w-12 mb-2" />
          <AlertTitle className="text-2xl mb-2">
            Private Gallery
          </AlertTitle>
          <AlertDescription className="text-base">
            Please request access from the editor
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-12 w-12 mb-2" />
          <AlertTitle className="text2xl mb-2">Gallery Not Found</AlertTitle>
          <AlertDescription className="text-base mb-4">
            {error instanceof Error
              ? error.message
              : "The gallery you are looking for does not exist or has been removed."}
          </AlertDescription>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            Return to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  if (!gallery && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gallery && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-xl">Gallery not found</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-semibold">Gallery Not Found</h1>
              <p className="text-muted-foreground">
                The gallery you're looking for doesn't exist or has been
                removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Image preloading logic
  const preloadAdjacentImages = (index: number) => {
    if (!gallery?.images) return;

    const preloadCount = 2;
    const images = gallery.images;

    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = (index + i) % images.length;
      const prevIndex = (index - i + images.length) % images.length;

      [nextIndex, prevIndex].forEach((idx) => {
        if (images[idx]?.publicId) {
          const img = new Image();
          img.src = getR2Image(images[idx], "thumb");
        }
      });
    }
  };

  // Preload adjacent images when lightbox opens

  const handleImageClick = (index: number) => {
    console.log("handleImageClick:", { isCommentPlacementMode });

    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
      return;
    }

    setSelectedImageIndex(index);
    preloadAdjacentImages(index);
  };

  // Add comment position handler
  const handleImageComment = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log("handleImageComment triggered");
    if (!isCommentPlacementMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log("Setting comment position:", { x, y });
    setNewCommentPos({ x, y });
    setIsCommentModalOpen(true);
  };

  // Render comment dialog with debugging
  const renderCommentDialog = () => {
    if (!isCommentModalOpen) return null;

    return (
      <CommentModal
        isOpen={isCommentModalOpen}
        position={newCommentPos}
        onClose={() => {
          setIsCommentModalOpen(false);
          setNewCommentPos(null);
          console.log("Comment modal closed");
        }}
        onSubmit={(content) => {
          if (!user) {
            console.log("User not authenticated, cannot submit comment");
            return;
          }

          if (!selectedImage?.id || !newCommentPos) return;

          createCommentMutation.mutate({
            imageId: selectedImage.id,
            content,
            x: newCommentPos.x,
            y: newCommentPos.y,
          });

          setIsCommentModalOpen(false);
          setNewCommentPos(null);
        }}
      />
    );
  };

  return (
    <UploadProvider>
      <>
        <CursorOverlay cursors={cursors} />
        {gallery && <GalleryActions gallery={gallery} />}
        {gallery && (
          <Helmet>
            <meta
              property="og:title"
              content={gallery.title || "Beam Gallery"}
            />
            <meta
              property="og:description"
              content="Explore stunning galleries!"
            />
            <meta
              property="og:image"
              content={
                gallery.ogImageUrl
                  ? getR2Image(gallery.ogImage, "thumb")
                  : `${import.meta.env.VITE_R2_PUBLIC_URL}/default-og.jpg`
              }
            />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={window.location.href} />
            <meta name="twitter:card" content="summary_large_image" />
          </Helmet>
        )}
        <div
          className={cn(
            "relative w-full flex-1",
            isDark ? "bg-black/90" : "bg-background",
          )}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {isDragActive && !selectMode && (
            <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white">
                  Drop images here
                </h3>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 lg:px-8 py-4">
            {gallery &&
              gallery.images.length === 0 &&
              images.filter((i) => "localUrl" in i).length === 0 && (
                <div className="my-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No images yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop images here to start your gallery
                  </p>
                </div>
              )}

            <AnimatePresence mode="wait">
              {isMasonry ? (
                <motion.div
                  key="masonry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Masonry
                    ref={masonryRef}
                    breakpointCols={breakpointCols}
                    className="flex -ml-4 w-[calc(100%+1rem)] masonrygrid"
                    columnClassName={cn(
                      "pl-4",
                      isDark ? "bg-black/90" : "bg-background",
                    )}
                  >
                    {(() => {
                      const allImages = [...images];

                      // Filter images based on current criteria
                      const filteredImages = allImages.filter((image: any) => {
                        if (
                          !image ||
                          !("localUrl" in image ? image.localUrl : image.url)
                        )
                          return false;
                        if ("localUrl" in image) return true; // Always show pending uploads
                        if (showStarredOnly && !image.userStarred) return false;
                        if (
                          showWithComments &&
                          (!image.commentCount || image.commentCount === 0)
                        )
                          return false;
                        if (selectedStarredUsers.length > 0) {
                          return (
                            image.stars?.some((star) =>
                              selectedStarredUsers.includes(star.userId),
                            ) || false
                          );
                        }
                        return true;
                      });

                      return filteredImages.map((image: any, index: number) =>
                        renderImage(image, index),
                      );
                    })()}
                  </Masonry>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${breakpointCols.default}, minmax(0, 1fr))`,
                  }}
                >
                  {(() => {
                    // Filter images based on current criteria
                    const filteredImages = combinedImages.filter(
                      (image: any) => {
                        if (
                          !image ||
                          !("localUrl" in image ? image.localUrl : image.url)
                        )
                          return false;
                        if ("localUrl" in image) return true; // Always show pending uploads
                        if (showStarredOnly && !image.userStarred) return false;
                        if (
                          showWithComments &&
                          (!image.commentCount || image.commentCount === 0)
                        )
                          return false;
                        if (selectedStarredUsers.length > 0) {
                          return (
                            image.stars?.some((star) =>
                              selectedStarredUsers.includes(star.userId),
                            ) || false
                          );
                        }
                        return true;
                      },
                    );

                    return filteredImages.map((image: any, index: number) =>
                      renderImage(image, index),
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logo */}
          <div
            className="fixed bottom-6 left-6 z-50 opacity-30 hover:opacity-60 transition-opacity cursor-pointer"
            onClick={() => (window.location.href = "/")}
          >
            <Logo size="sm" />
          </div>

          {/* Scale Slider */}
          <div className="fixed bottom-6 right-6 z-50 bg-background/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={25}
              max={150}
              step={5}
              className="w-[150px] touch-none select-none"
              aria-label="Adjust gallery scale"
            />
          </div>

          {/* Render mobile view when on mobile devices */}
          <AnimatePresence>
            {isMobile && showMobileView && gallery?.images && (
              <MobileGalleryView
                images={gallery.images}
                initialIndex={mobileViewIndex}
                onClose={() => {
                  setShowMobileView(false);
                  setMobileViewIndex(-1);
                }}
              />
            )}
          </AnimatePresence>

          {/* Only render the desktop lightbox when not on mobile */}
          {!isMobile && selectedImageIndex >= 0 && (
            <Dialog
              open={selectedImageIndex >= 0}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedImageIndex(-1);
                  setNewCommentPos(null);
                }
              }}
            >
              <LightboxDialogContent
                aria-describedby="gallery-lightbox-description"
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedImageIndex(-1);
                    setNewCommentPos(null);
                  }
                }}
              >
                <div id="gallery-lightbox-description" className="sr-only">
                  Image viewer with annotation and commenting capabilities
                </div>

                {/* Filename display */}
                {selectedImage?.originalFilename && (
                  <div className="absolute top-6 left-6 bg-background/80 backdrop-blur-sm rounded px-3 py-1.5 text-sm font-medium z-50">
                    {selectedImage.originalFilename}
                  </div>
                )}

                {/* Navigation buttons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-gray-800 hover:bg-gray-200",
                  )}
                  onClick={() => {
                    if (!gallery?.images?.length) return;
                    setSelectedImageIndex((prev) => {
                      const newIndex =
                        prev <= 0 ? gallery.images.length - 1 : prev - 1;
                      preloadAdjacentImages(newIndex);
                      return newIndex;
                    });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-gray-800 hover:gray-200",
                  )}
                  onClick={() => {
                    if (!gallery?.images?.length) return;
                    setSelectedImageIndex((prev) => {
                      const newIndex =
                        prev >= gallery.images.length - 1 ? 0 : prev + 1;
                      preloadAdjacentImages(newIndex);
                      return newIndex;
                    });
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Controls */}
                <div className="absolute right-16 top-4 flex items-center gap-2 z-50">
                  {selectedImage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-md bg-background/80 hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();

                        // Optimistic UI update for selected image
                        setSelectedImage((prev) =>
                          prev
                            ? { ...prev, userStarred: !prev.userStarred }
                            : prev,
                        );

                        // Perform mutation to sync with backend
                        toggleStarMutation.mutate({
                          imageId: selectedImage.id,
                          isStarred: selectedImage.userStarred,
                        });
                      }}
                    >
                      {selectedImage.userStarred ? (
                        <Star className="h-5 w-5 fill-black dark:fill-white transition-all duration-300 scale-110" />
                      ) : (
                        <Star className="h-5 w-5 stroke-black dark:stroke-white fill-transparent transition-all duration-300 hover:scale-110" />
                      )}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        isDark
                          ? "text-white hover:bg-white/10"
                          : "text-gray-800 hover:bg-gray-200",
                      )}
                      onClick={() => setShowAnnotations(!showAnnotations)}
                      title={
                        showAnnotations ? "Hide Comments" : "Show Comments"
                      }
                    >
                      {showAnnotations ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <SignedIn>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9",
                          isDark
                            ? "text-white hover:bg-white/10"
                            : "text-zinc-800 hover:bg-zinc-200",
                          isCommentPlacementMode && "bg-primary/20",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCommentPlacementMode(!isCommentPlacementMode);
                          setIsAnnotationMode(false);
                          setNewCommentPos(null);
                        }}
                        title="Add Comment"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </SignedIn>
                    <SignedOut>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9",
                          isDark
                            ? "text-white hover:bg-white/10"
                            : "text-zinc-800 hover:bg-zinc-200",
                        )}
                        onClick={() => setShowLoginModal(true)}
                        title="Sign in to comment"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <LoginModal
                        isOpen={showLoginModal}
                        onClose={() => setShowLoginModal(false)}
                      />
                    </SignedOut>
                  </div>
                </div>

                {selectedImage && (
                  <motion.div
                    className={`relative w-full h-full flex items-center justify-center ${
                      isCommentPlacementMode ? "cursor-crosshair" : ""
                    }`}
                    {...(isMobile && {
                      drag: "x" as const,
                      dragConstraints: { left: 0, right: 0 },
                      dragElastic: 1,
                      onDragEnd: (e: any, info: PanInfo) => {
                        const swipe = Math.abs(info.offset.x) * info.velocity.x;
                        if (
                          swipe < -100 &&
                          selectedImageIndex < gallery!.images.length - 1
                        ) {
                          setSelectedImageIndex(selectedImageIndex + 1);
                        } else if (swipe > 100 && selectedImageIndex > 0) {
                          setSelectedImageIndex(selectedImageIndex - 1);
                        }
                      },
                    })}
                    onClick={(e) => {
                      if (!isCommentPlacementMode) return;
                      const target = e.currentTarget;
                      const rect = target.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setNewCommentPos({ x, y });
                      setIsCommentPlacementMode(false);
                    }}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio:
                          selectedImage?.width && selectedImage?.height
                            ? `${selectedImage.width}/${selectedImage.height}`
                            : "16/9",
                        overflow: "hidden",
                      }}
                    >
                      {isLowResLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
                        </div>
                      )}

                      {/* Final high-res image */}
                      <motion.img
                        src={getR2Image(selectedImage, "lightbox")}
                        data-src={getR2Image(selectedImage, "lightbox")}
                        alt={selectedImage.originalFilename || ""}
                        className="lightbox-img"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          visibility: isLowResLoading ? "hidden" : "visible",
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onLoad={(e) => {
                          setIsLowResLoading(false);
                          setIsLoading(false);

                          const img = e.currentTarget;
                          img.src = img.dataset.src || img.src;
                          img.classList.add("loaded");

                          setImageDimensions({
                            width: img.clientWidth,
                            height: img.clientHeight,
                          });
                        }}
                        onError={() => {
                          setIsLoading(false);
                          setIsLowResLoading(false);
                        }}
                      />

                      {/* Drawing Canvas */}
                      <div className="absolute inset-0">
                        <DrawingCanvas
                          width={imageDimensions?.width || 800}
                          height={imageDimensions?.height || 600}
                          imageWidth={imageDimensions?.width}
                          imageHeight={imageDimensions?.height}
                          isDrawing={isAnnotationMode}
                          savedPaths={showAnnotations ? annotations : []}
                          onSavePath={async (pathData) => {
                            if (!selectedImage) return;
                            try {
                              await fetch(
                                `/api/images/${selectedImage.id}/annotations`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ pathData }),
                                },
                              );

                              queryClient.invalidateQueries({
                                queryKey: [
                                  `/api/images/${selectedImage.id}/annotations`,
                                ],
                              });

                              toast({
                                title: "Annotation saved",
                                description:
                                  "Your drawing has been saved successfully.",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description:
                                  "Failed to save annotation. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </div>

                      {/* Comments */}
                      {showAnnotations &&
                        selectedImage?.id &&
                        comments.map((comment) => {
                          console.log('Rendering CommentBubble:', {
                            commentId: comment.id,
                            parentId: comment.parentId,
                            imageId: selectedImage.id
                          });
                          return (
                            <CommentBubble
                              key={comment.id}
                              id={comment.id}
                              x={comment.xPosition}
                              y={comment.yPosition}
                              content={comment.content}
                              author={comment.author}
                              imageId={Number(selectedImage.id)}
                              replies={comment.replies || []}
                              parentId={comment.parentId}
                            />
                          );
                        })}

                      {/* New comment placement */}
                      {newCommentPos && selectedImage && (
                        <CommentBubble
                          x={newCommentPos.x}
                          y={newCommentPos.y}
                          isNew={true}
                          imageId={Number(selectedImage.id)}
                          replies={[]}
                          onSubmit={() => {
                            setNewCommentPos(null);
                            queryClient.invalidateQueries({
                              queryKey: ["/api/galleries"],
                            });
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </LightboxDialogContent>
            </Dialog>
          )}

          {/* New comment placement outside lightbox */}
          {newCommentPos && selectedImage && (
            <CommentBubble
              x={newCommentPos.x}
              y={newCommentPos.y}
              isNew={true}
              imageId={Number(selectedImage.id)}
              replies={[]}
              onSubmit={() => {
                setNewCommentPos(null);
                queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
              }}
            />
          )}
          {/* Share Modal */}
          {isOpenShareModal && gallery && (
            <ShareModal
              isOpen={isOpenShareModal}
              onClose={() => setIsOpenShareModal(false)}
              isPublic={gallery?.isPublic || false}
              onVisibilityChange={(checked) =>
                toggleVisibilityMutation.mutate(checked)
              }
              galleryUrl={window.location.href}
              slug={slug}
            />
          )}
          {renderCommentDialog()}

          <AnimatePresence>
            {selectMode && (
              <FloatingToolbar
                selectedCount={selectedImages.length}
                totalCount={gallery?.images?.length || 0}
                onDeselect={() => {
                  setSelectedImages([]);
                  setSelectMode(false);
                }}
                onSelectAll={() => {
                  const allImageIds = gallery?.images?.map(img => img.id) || [];
                  setSelectedImages(allImageIds);
                }}
                onDelete={handleDeleteSelected}
                onDownload={handleDownloadSelected}
                onEdit={handleEditSelected}
              />
            )}
          </AnimatePresence>
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />
          <SignUpModal
            isOpen={showSignUpModal}
            onClose={() => setShowSignUpModal(false)}
          />
        </div>
      </>
    </UploadProvider>
  );
}