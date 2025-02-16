import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getR2Image } from "@/lib/r2";
import { io } from 'socket.io-client';
import GalleryActions from '@/components/GalleryActions';
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
import { useGalleryData } from "@/hooks/use-gallery-data";
import { useImageOperations } from "@/hooks/use-image-operations";

// Initialize Socket.IO client
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

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
}

interface ImageDimensions {
  width: number;
  height: number;
}

import { Helmet } from "react-helmet";

export default function Gallery({
  slug: propSlug,
}: GalleryProps) {
  const params = useParams();
  const slug = propSlug || params?.slug;
  const { user } = useUser();
  const [myColor, setMyColor] = useState("#ccc");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0,
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const masonryRef = useRef<any>(null);
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isMasonry, setIsMasonry] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [userRole, setUserRole] = useState<string>("Viewer");
  const [selectedStarredUsers, setSelectedStarredUsers] = useState<string[]>([]);
  const [isOpenShareModal, setIsOpenShareModal] = useState(false);
  const [isPrivateGallery, setIsPrivateGallery] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showFilename, setShowFilename] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLowResLoading, setIsLowResLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(100);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [showWithComments, setShowWithComments] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
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


  // Data and mutations from hooks
  const { 
    gallery,
    isLoading: isGalleryLoading,
    error,
    toggleStarMutation,
    reorderImageMutation,
    deleteImagesMutation,
    handleTitleUpdate
  } = useGalleryData(slug);

  const {
    images,
    setImages,
    onDrop,
    uploadSingleFile,
    handleDownloadAll,
    handleDownloadSelected,
    handleCopyLink,
    handleGuestUpload,
    handleImageSelect,
    handleDeleteSelected,
    handleEditSelected,
    handleDragEnd,
    handleImageClick,
    handleImageComment,
    toggleGridView,
    toggleSelectMode,
    toggleReorderMode,
    handleStarredToggle,
    handleReorderToggle,
    preloadAdjacentImages,
    renderGalleryControls,
    getUniqueStarredUsers,
    createCommentMutation
  } = useImageOperations(slug, queryClient, toast, user, setImages, uploadSingleFile);

  // User color fetch
  useEffect(() => {
    if (!user) return;

    async function fetchMyColor() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load cached user data");
        const data = await res.json();
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

  // Socket.IO connection handlers and Pusher presence channel subscription
  useEffect(() => {
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

    if (!user || !slug) {
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

      setCursors((prev) => {
        const otherCursors = prev.filter((cursor) => cursor.id !== data.id);
        return [...otherCursors, { ...data, lastActive: Date.now() }];
      });

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
      setActiveUsers([]);
      setPresenceMembers({});
      setCursors([]);
    };
  }, [user, socket, slug]);

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

    if (pusherClient.channel(channelName)) {
      console.log("Cleaning up existing subscription to:", channelName);
      pusherClient.unsubscribe(channelName);
    }

    const channel = pusherClient.subscribe(channelName);

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

    return () => {
      console.log("Cleaning up Pusher subscription for:", channelName);
      setActiveUsers([]); 
      setPresenceMembers({}); 
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.unsubscribe(channelName); 
    };
  }, [slug, user]);

  const handleGuestUpload = async (files: File[]) => {
    if (guestGalleryCount >= 1) {
      window.location.href = "/sign-up";
      return;
    }
    console.log("Uploading guest gallery with guestUpload flag...");
    setGuestGalleryCount(1);
    sessionStorage.setItem("guestGalleryCount", "1");

    if (files?.length) {
    }
  };

  const { getToken } = useAuth();

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

  const preloadImage = useCallback((image: Image, imageId: number) => {
    const img = new Image();
    img.src = getR2Image(image, "thumb");
    img.onload = () => {
      setPreloadedImages((prev) => new Set([...Array.from(prev), imageId]));
    };
  }, []);

  useEffect(() => {
    if (masonryRef.current?.layout) {
      masonryRef.current.layout();
    }
  }, [gallery?.images, images]);

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
        const response = await fetch(getR2Image(image)); 
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

  const handleReorderToggle = () => {
    if (isReorderMode && reorderImageMutation.isPending) return;
    setIsReorderMode(!isReorderMode);
  };

  const handleStarredToggle = () => {
    setShowStarredOnly(!showStarredOnly);
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedImages([]);
      setIsReorderMode(false);
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
    toast({
      title: "Coming Soon",
      description: "Batch editing will be available soon!",
    });
  };

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
  };

  const handleDragEnd = useCallback(
    (
      event: PointerEvent | MouseEvent | TouchEvent,
      draggedIndex: number,
      info: PanInfo,
    ) => {
      setDraggedItemIndex(null);
      setDragPosition(null);

      if (!gallery || !isReorderMode) return;

      const galleryItems = Array.from(
        document.querySelectorAll(".image-container"),
      );
      if (galleryItems.length === 0 || draggedIndex >= galleryItems.length)
        return;

      let targetIndex = draggedIndex;
      let closestDistance = Infinity;

      const cursorPos = {
        x:
          event instanceof MouseEvent
            ? event.clientX
            : "touches" in event && event.touches[0]
              ? event.touches[0].clientX
              : info.point.x,
        y:
          event instanceof MouseEvent
            ? event.clientY
            : "touches" in event && event.touches[0]
              ? event.touches[0].clientY
              : info.point.y,
      };

      galleryItems.forEach((item, index) => {
        if (index === draggedIndex) return;

        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distance = Math.hypot(
          centerX - cursorPos.x,
          centerY - cursorPos.y,
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          targetIndex = index;
        }
      });

      if (targetIndex !== draggedIndex) {
        const updatedImages = [...gallery.images];
        const [movedImage] = updatedImages.splice(draggedIndex, 1);
        updatedImages.splice(targetIndex, 0, movedImage);

        queryClient.setQueryData([`/api/galleries/${slug}`], {
          ...gallery,
          images: updatedImages,
        });

        reorderImageMutation.mutate(updatedImages.map((img) => img.id));
      }
    },
    [gallery, isReorderMode, queryClient, reorderImageMutation, slug],
  );

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getUniqueStarredUsers = useMemo(() => {
    if (!gallery?.images) return [];
    const usersSet = new Set<string>();
    const users: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      imageUrl: string | null;
    }[] = [];

    gallery.images.forEach((image) => {
      image.stars?.forEach((star) => {
        if (!usersSet.has(star.userId)) {
          usersSet.add(star.userId);
          users.push({
            userId: star.userId,
            firstName: star.firstName || null,
            lastName: star.lastName || null,
            imageUrl: star.imageUrl || null,
          });
        }
      });
    });

    return users;
  }, [gallery?.images]);

  const renderGalleryControls = useCallback(() => {
    if (!gallery) return null;

    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg",
          isDark ? "bg-black/90" : "bg-white/90",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {activeUsers.filter(member => 
              member.lastActive && 
              Date.now() - new Date(member.lastActive).getTime() < 30000
            ).map((member) => (
              <UserAvatar
                key={member.userId}
                name={member.name}
                imageUrl={member.avatar}
                color={member.color || "#ccc"}
                size="xs"
                isActive={true}
                className="border-2 border-white/40 dark:border-black hover:translate-y-[-2px] transition-transform"
              />
            ))}
          </div>
        </div>
        <TooltipProvider>
          <StarredUsersFilter
            users={getUniqueStarredUsers}
            selectedUsers={selectedStarredUsers}
            onSelectionChange={setSelectedStarredUsers}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleGridView}
                className={cn(
                  "h-9 w-9",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-zinc-800 hover:bg-zinc-200",
                  !isMasonry && "bg-primary/20",
                )}
              >
                {isMasonry ? (
                  <Grid className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{`Switch to ${isMasonry ? "grid" : "masonry"} view`}</TooltipContent>
          </Tooltip>

          {selectMode && <></>}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-9 w-9",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-gray-800 hover:bg-gray-200",
                )}
                onClick={() => setIsOpenShareModal(true)}
              >
                <Share className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share Gallery</TooltipContent>
          </Tooltip>

          {userRole === "Edit" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={selectMode}
                  onPressedChange={toggleSelectMode}
                  className={cn(
                    "h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10 data-[state=on]:bg-white/20 data-[state=on]:text-white data-[state=on]:ring-2 data-[state=on]:ring-white/20"
                      : "text-gray-800 hover:bg-gray-200 data-[state=on]:bg-accent/30 data-[state=on]:text-accent-foreground data-[state=on]:ring-2 data-[state=on]:ring-accent",
                  )}
                >
                  <SquareScissors className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {selectMode ? "Done" : "Select Images"}
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    );
  }, [
    gallery,
    isDark,
    isMasonry,
    selectMode,
    isReorderMode,
    selectedImages.length,
    showStarredOnly,
    showWithComments,
    deleteImagesMutation,
    toggleReorderMode,
    toggleSelectMode,
    setIsOpenShareModal,
  ]);

  const renderImage = (image: ImageOrPending, index: number) => (
    <div
      key={image.id === -1 ? `pending-${index}` : image.id}
      className="mb-4 w-full"
      style={{ breakInside: "avoid", position: "relative" }}
    >
      <motion.div
        layout={false}
        className={cn(
          "image-container transform transition-opacity duration-200 wfull",
          isReorderMode && "cursor-grab active:cursor-grabbing",
          draggedItemIndex === index ? "fixed" : "relative",
          "localUrl" in image && "opacity-80",
          "block",
        )}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: {
            duration: 0.2,
          },
        }}
        drag={isReorderMode}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setDraggedItemIndex(index)}
        onDrag={(_, info) => {
          setDragPosition({ x: info.point.x, y: info.point.y });
        }}
        onDragEnd={(event, info) =>
          handleDragEnd(event as PointerEvent, index, info)
        }
      >
        <div
          className={`group relative bg-card rounded-lg transform transition-all ${
            !isReorderMode ? "hover:scale-[1.02] cursor-pointer" : ""
          } ${selectMode ? "hover:scale-100" : ""} ${
            isReorderMode
              ? "border-2 border-dashed border-gray-200 border-opacity-50"
              : ""
          }`}
          onClick={(e) => {
            if (isReorderMode) {
              e.stopPropagation();
              return;
            }
            selectMode
              ? handleImageSelect(image.id, e)
              : handleImageClick(index);
          }}
        >
          <img
            key={`${image.id}-${image._status || "final"}`}
            src={
              "localUrl" in image ? image.localUrl : getR2Image(image, "thumb")
            }
            alt={image.originalFilename || "Uploaded image"}
            className={cn(
              "w-full h-auto rounded-lg blur-up transition-opacity duration-200 object-contain",
              selectMode && selectedImages.includes(image.id) && "opacity-75",
              draggedItemIndex === index && "opacity-50",
              "localUrl" in image && "opacity-80",
              image.status === "error" && "opacity-50",
            )}
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget;
              img.classList.add("loaded");
              if (!("localUrl" in image) && image.pendingRevoke) {
                setTimeout(() => {
                  URL.revokeObjectURL(image.pendingRevoke);
                }, 800);
              }
            }}
            onError={(e) => {
              console.error("Image load failed:", {
                id: image.id,
                url: image.url,
                isPending: "localUrl" in image,
                status: image.status,
                originalFilename: image.originalFilename,
              });
              if (!("localUrl" in image)) {
                e.currentTarget.src = "https://cdn.beam.ms/placeholder.jpg";
                setImages((prev) =>
                  prev.map((upload) =>
                    upload.id === image.id
                      ? { ...upload, status: "error", _status: "error" }
                      : upload,
                  ),
                );
              }
            }}
            draggable={false}
          />
          {"localUrl" in image && (
            <div className="absolute inset-0 flex items-center justify-center ring-2 ring-purple-500/40">
              {image.status === "uploading" && (
                <>
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-2 rounded-full">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <Progress value={image.progress} className="w-3/4 h-1" />
                </>
              )}
              {image.status === "finalizing" && (
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs font-medium">Finalizing...</span>
                </div>
              )}
              {image.status === "error" && (
                <div className="absolute top-2 right-2 bg-destructive/80 backdrop-blur-sm p-2 rounded-full">
                  <AlertCircle className="h-4 w-4 text-destructive-foreground" />
                </div>
              )}
            </div>
          )}

          {!selectMode && (
            <div className="absolute bottom-2 left-2 z-10">
              <StarredAvatars imageId={image.id} />
            </div>
          )}

          {!selectMode && userRole && ['owner', 'Edit', 'Comment'].includes(userRole) && (
            <motion.div
              className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.8 }}
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bgbackground/80 hover:bg-background shadow-sm backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();

                  if (!user) {
                    setShowSignUpModal(true);
                    return;
                  }

                  const hasUserStarred = image.userStarred;

                  setSelectedImageIndex((prevIndex) => {
                    if (prevIndex >= 0) {
                      setSelectedImage((prev) =>
                        prev ? { ...prev, userStarred: !hasUserStarred } : prev,
                      );
                    }
                    return prevIndex;
                  });

                  queryClient.setQueryData(
                    [`/api/galleries/${slug}`],
                    (old: any) => ({
                      ...old,
                      images: old.images.map((img: Image) =>
                        img.id === image.id
                          ? { ...img, userStarred: !hasUserStarred }
                          : img,
                      ),
                    }),
                  );

                  queryClient.setQueryData(
                    [`/api/images/${image.id}/stars`],
                    (old: any) => {
                      if (!old) return { success: true, data: [] };

                      const updatedStars = hasUserStarred
                        ? old.data.filter(
                            (star: any) => star.userId !== user?.id,
                          )
                        : [
                            ...old.data,
                            {
                              userId: user?.id,
                              imageId: image.id,
                              user: {
                                firstName: user?.firstName,
                                lastName: user?.lastName,
                                imageUrl: user?.imageUrl,
                              },
                            },
                          ];

                      return { ...old, data: updatedStars };
                    },
                  );

                  toggleStarMutation.mutate(
                    { imageId: image.id, isStarred: hasUserStarred },
                    {
                      onError: () => {
                        queryClient.setQueryData(
                          [`/api/galleries/${slug}`],
                          (old: any) => ({
                            ...old,
                            images: old.images.map((img: Image) =>
                              img.id === image.id
                                ? { ...img, starred: hasUserStarred }
                                : img,
                            ),
                          }),
                        );

                        queryClient.setQueryData(
                          [`/api/images/${image.id}/stars`],
                          (old: any) => {
                            if (!old) return { success: true, data: [] };

                            return {
                              ...old,
                              data: hasUserStarred
                                ? [
                                    ...old.data,
                                    {
                                      userId: user?.id,
                                      imageId: image.id,
                                      user: {
                                        firstName: user?.firstName,
                                        lastName: user?.lastName,
                                        imageUrl: user?.imageUrl,
                                      },
                                    },
                                  ]
                                : old.data.filter(
                                    (star: any) => star.userId !== user?.id,
                                  ),
                            };
                          },
                        );

                        if (selectedImage?.id === image.id) {
                          setSelectedImage((prev) =>
                            prev ? { ...prev, starred: hasUserStarred } : prev,
                          );
                        }

                        toast({
                          title: "Error",
                          description:"Failed to update star status. Please try again.",
                          variant: "destructive",
                        });
                      },
                    },
                  );
                }}
              >
                <motion.div
                  animate={{
                    scale: image.userStarred ? 1.2 : 1,
                    opacity: image.userStarred ? 1 : 0.6,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {image.userStarred ? (
                    <Star className="h-4 w-4 fill-black dark:fill-white transition-all duration-300" />
                  ) : (
                    <Star className="h-4 w-4 stroke-black dark:stroke-white fill-transparent transition-all duration-300" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
          )}

          {!selectMode && image.commentCount! > 0 && (
            <Badge
              className="absolute top-2 right-2 bg-primary text-primary-foreground flex items-center gap-1"
              variant="secondary"
            >
              <MessageSquare className="w-3 h-3" />
              {image.commentCount}{" "}
            </Badge>
          )}

          {selectMode && !isReorderMode && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 z-10"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedImages.includes(image.id)
                    ? "bg-primary border-primary"
                    : "bg-background/80 border-background/80"
                }`}
              >
                {selectedImages.includes(image.id) && (
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectMode) {
        e.preventDefault();
        setSelectedImages([]);
        setSelectMode(false);
        return;
      }

      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectMode]);

  useEffect(() => {
    if (selectedImageIndex >= 0) {
      const handleKeyDown = (e: KeyboardEvent) => {
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

  const { session } = useClerk();

  return (
    <UploadProvider>
      <>
        <CursorOverlay cursors={cursors} />
        {gallery && <GalleryActions 
          gallery={gallery}
          images={images}
          onDrop={onDrop}
          toggleStar={toggleStarMutation.mutate}
          reorderImages={reorderImageMutation.mutate}
          deleteImages={deleteImagesMutation.mutate}
          userColor={myColor}
          handleCopyLink={handleCopyLink}
          handleDownloadAll={handleDownloadAll}
          handleDownloadSelected={handleDownloadSelected}
          handleGuestUpload={handleGuestUpload}
          handleImageSelect={handleImageSelect}
          handleDeleteSelected={handleDeleteSelected}
          handleEditSelected={handleEditSelected}
          handleDragEnd={handleDragEnd}
          handleImageClick={handleImageClick}
          handleImageComment={handleImageComment}
          toggleGridView={toggleGridView}
          toggleSelectMode={toggleSelectMode}
          toggleReorderMode={toggleReorderMode}
          handleStarredToggle={handleStarredToggle}
          handleReorderToggle={handleReorderToggle}
          preloadAdjacentImages={preloadAdjacentImages}
          renderGalleryControls={renderGalleryControls}
          getUniqueStarredUsers={getUniqueStarredUsers}
          createCommentMutation={createCommentMutation}
          handleTitleUpdate={handleTitleUpdate}
          isDark={isDark}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          showFilename={showFilename}
          setShowFilename={setShowFilename}
          showAnnotations={showAnnotations}
          setShowAnnotations={setShowAnnotations}
          isAnnotationMode={isAnnotationMode}
          setIsAnnotationMode={setIsAnnotationMode}
          isCommentPlacementMode={isCommentPlacementMode}
          setIsCommentPlacementMode={setIsCommentPlacementMode}
          isOpenShareModal={isOpenShareModal}
          setIsOpenShareModal={setIsOpenShareModal}
          isPrivateGallery={isPrivateGallery}
          setIsPrivateGallery={setIsPrivateGallery}
          showLoginModal={showLoginModal}
          setShowLoginModal={setShowLoginModal}
          showSignUpModal={showSignUpModal}
          setShowSignUpModal={setShowSignUpModal}
          isMobile={isMobile}
          setIsMobile={setIsMobile}
          showMobileView={showMobileView}
          setShowMobileView={setShowMobileView}
          mobileViewIndex={mobileViewIndex}
          setMobileViewIndex={setMobileViewIndex}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
          isMasonry={isMasonry}
          setIsMasonry={setIsMasonry}
          draggedItemIndex={draggedItemIndex}
          setDraggedItemIndex={setDraggedItemIndex}
          dragPosition={dragPosition}
          setDragPosition={setDragPosition}
          showWithComments={showWithComments}
          setShowWithComments={setShowWithComments}
          userRole={userRole}
          setUserRole={setUserRole}
          images={images}
          setImages={setImages}
          breakpointCols={breakpointCols}
          scale={scale}
          setScale={setScale}
          preloadedImages={preloadedImages}
          setPreloadedImages={setPreloadedImages}
          guestGalleryCount={guestGalleryCount}
          setGuestGalleryCount={setGuestGalleryCount}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          isLowResLoading={isLowResLoading}
          setIsLowResLoading={setIsLowResLoading}
          selectedImageIndex={selectedImageIndex}
          setSelectedImageIndex={setSelectedImageIndex}
          newCommentPos={newCommentPos}
          setNewCommentPos={setNewCommentPos}
          presenceMembers={presenceMembers}
          setPresenceMembers={setPresenceMembers}
          activeUsers={activeUsers}
          setActiveUsers={setActiveUsers}
          cursors={cursors}
          setCursors={setCursors}
          myColor={myColor}
          setMyColor={setMyColor}
          socket={socket}
          pusherClient={pusherClient}
          masonryRef={masonryRef}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          annotations={annotations}
          comments={comments}
          isCommentsLoading={isCommentsLoading}
          commentsError={commentsError}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          showStarredOnly={showStarredOnly}
          setShowStarredOnly={setShowStarredOnly}
          isReorderMode={isReorderMode}
          setIsReorderMode={setIsReorderMode}
          isAnnotationMode={isAnnotationMode}
          setIsAnnotationMode={setIsAnnotationMode}
          isCommentPlacementMode={isCommentPlacementMode}
          setIsCommentPlacementMode={setIsCommentPlacementMode}
          imageDimensions={imageDimensions}
          setImageDimensions={setImageDimensions}
          showFilename={showFilename}
          setShowFilename={setShowFilename}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          isLowResLoading={isLowResLoading}
          setIsLowResLoading={setIsLowResLoading}
          preloadedImages={preloadedImages}
          setPreloadedImages={setPreloadedImages}
          isMobile={isMobile}
          setIsMobile={setIsMobile}
          showMobileView={showMobileView}
          setShowMobileView={setShowMobileView}
          mobileViewIndex={mobileViewIndex}
          setMobileViewIndex={setMobileViewIndex}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
          isMasonry={isMasonry}
          setIsMasonry={setIsMasonry}
          draggedItemIndex={draggedItemIndex}
          setDraggedItemIndex={setDraggedItemIndex}
          dragPosition={dragPosition}
          setDragPosition={setDragPosition}
          showWithComments={showWithComments}
          setShowWithComments={setShowWithComments}
          userRole={userRole}
          setUserRole={setUserRole}
          slug={slug}
          queryClient={queryClient}
          toast={toast}
          user={user}
          uploadSingleFile={uploadSingleFile}
          { ...rest }
        />}
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

                      const filteredImages = allImages.filter((image: any) => {
                        if (
                          !image ||
                          !("localUrl" in image ? image.localUrl : image.url)
                        )
                          return false;
                        if ("localUrl" in image) return true; 
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
                    const filteredImages = combinedImages.filter(
                      (image: any) => {
                        if (
                          !image ||
                          !("localUrl" in image ? image.localUrl : image.url)
                        )
                          return false;
                        if ("localUrl" in image) return true; 
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

          {dragPosition && draggedItemIndex !== null && gallery?.images && (
            <motion.div
              className="fixed pointer-events-none z-50 ghost-image"
              style={{
                top: dragPosition.y,
                left: dragPosition.x,
                transform: "translate(-50%, -50%)",
                width: "80px",
                height: "80px",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 0.8,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                },
              }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <img
                src={gallery.images[draggedItemIndex].url}
                alt="Dragged Preview"
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </motion.div>
          )}

          <div
            className="fixed bottom-6 left-6 z-50 opacity-30 hover:opacity-60 transition-opacity cursor-pointer"
            onClick={() => (window.location.href = "/")}
          >
            <Logo size="sm" />
          </div>

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

                {selectedImage?.originalFilename && (
                  <div className="absolute top-6 left-6 bg-background/80 backdrop-blur-sm rounded px-3 py-1.5 text-sm font-medium z-50">
                    {selectedImage.originalFilename}
                  </div>
                )}

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
                      : "text-gray-800 hover:bg-gray-200",
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

                <div className="absolute right-16 top-4 flex items-center gap-2 z-50">
                  {selectedImage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-md bg-background/80 hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();

                        setSelectedImage((prev) =>
                          prev
                            ? { ...prev, userStarred: !prev.userStarred }
                            : prev,
                        );

                        toggleStarMutation.mutate({
                          imageId: selectedImage.id,
                          isStarred: selectedImage.userStarred,
                        });
                      }}
                    >
                      {selectedImage.userStarred ? (
                        <Star<Star className="h-5 w-5 fill-black dark:fill-white transition-all duration-300 scale-110" />
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
                onReorder={() => setIsReorderMode(!isReorderMode)}
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