import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { io } from "socket.io-client";
import PusherClient from "pusher-js";
import { nanoid } from "nanoid";
import { useAuth, useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

import GalleryHeader from "./GalleryHeader";
import GalleryGrid from "./GalleryGrid";
import LightboxModal from "./LightboxModal";
import UploadDropzone from "./UploadDropzone";

// Other components and context providers (already created in your codebase)
import GalleryActions from "@/components/GalleryActions";
import { CursorOverlay } from "@/components/CursorOverlay";
import { CommentModal } from "@/components/CommentModal";
import { LoginModal } from "@/components/LoginModal";
import { SignUpModal } from "@/components/SignUpModal";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import DrawingCanvas from "@/components/DrawingCanvas";
import CommentBubble from "@/components/CommentBubble";
import { StarredUsersFilter } from "@/components/StarredUsersFilter";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { ShareModal } from "@/components/ShareModal";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { useUpload, UploadProvider } from "@/context/UploadContext";

// Import types from your types file
import type {
  Image,
  Gallery as GalleryType,
  Comment,
  Annotation,
  ImageOrPending,
  PendingImage,
} from "@/types/gallery";

// Initialize Socket.IO client
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
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
if (
  !import.meta.env.VITE_PUSHER_KEY ||
  !import.meta.env.VITE_PUSHER_CLUSTER ||
  !import.meta.env.VITE_PUSHER_APP_ID
) {
  console.error("Missing required Pusher environment variables");
}

interface GalleryContainerProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

export default function GalleryContainer({
  slug: propSlug,
  title,
  onHeaderActionsChange,
}: GalleryContainerProps) {
  const params = useParams();
  const slug = propSlug || params?.slug;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const { isDark } = useTheme();

  // Query the gallery data
  const { data: gallery, isLoading, error } = useQuery<GalleryType>({
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
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
        if (res.status === 403) throw new Error("This gallery is private");
        if (res.status === 404) throw new Error("Gallery not found");
        throw new Error("Failed to fetch gallery");
      }
      return res.json();
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
        description: err instanceof Error ? err.message : "Failed to load gallery",
        variant: "destructive",
      });
    },
  });

  // Process images (e.g. add displayUrl, aspectRatio)
  const processedImages = useMemo(() => {
    if (!gallery?.images) return [];
    return gallery.images
      .filter((img) => img && img.url)
      .map((img) => ({
        ...img,
        displayUrl: img.url, // Replace with your getR2Image function if needed
        aspectRatio: img.width && img.height ? img.width / img.height : 1.33,
      }));
  }, [gallery]);

  // Many state values from your original file…
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<any[]>([]);
  const [myColor, setMyColor] = useState("#ccc");
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0
  );
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(100);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showFilename, setShowFilename] = useState(true);
  const [isLowResLoading, setIsLowResLoading] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isMasonry, setIsMasonry] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [showWithComments, setShowWithComments] = useState(false);
  const [userRole, setUserRole] = useState<string>("Viewer");
  const [images, setImages] = useState<ImageOrPending[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [isOpenShareModal, setIsOpenShareModal] = useState(false);
  const [isPrivateGallery, setIsPrivateGallery] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [selectedStarredUsers, setSelectedStarredUsers] = useState<string[]>([]);

  // Comment and annotation queries
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const { data: annotations = [] } = useQuery<Annotation[]>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/images/${selectedImage?.id}/comments`],
    enabled: !!selectedImage?.id,
    select: (data) =>
      data.map((comment) => ({
        ...comment,
        author: {
          id: comment.userId || "unknown",
          username: comment.userName || "Unknown User",
          imageUrl: comment.userImageUrl || undefined,
          color: comment.color || "#ccc",
        },
      })),
  });

  // Update selected image based on index
  useEffect(() => {
    if (gallery?.images) {
      setSelectedImage(gallery.images[selectedImageIndex] ?? null);
    }
  }, [selectedImageIndex, gallery]);

  // SOCKET & PRESENCE logic (same as your original code)
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!user || !myColor || !slug) return;
    const cursorData = {
      id: user.id,
      name: user.firstName || user.username || "Anonymous",
      color: myColor,
      x: event.clientX,
      y: event.clientY,
      lastActive: Date.now(),
      gallerySlug: slug,
    };
    socket.emit("cursor-update", cursorData);
  }, [user, myColor, slug]);

  useEffect(() => {
    if (user) {
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
    }
  }, [user]);

  useEffect(() => {
    if (user && userLoaded && user.session && user.session.status === "expired") {
      user.session.refresh().catch((error) =>
        console.error("Failed to refresh Clerk session:", error)
      );
    }
  }, [user, userLoaded]);

  useEffect(() => {
    if (!user || !slug) {
      setActiveUsers([]);
      setCursors([]);
      return;
    }
    const joinGallery = () => {
      if (slug && socket.connected) {
        socket.emit("join-gallery", slug);
        console.log("Joined gallery room:", slug);
      }
    };
    joinGallery();
    socket.on("connect", () => {
      console.log("Connected to Socket.IO:", socket.id);
      joinGallery();
    });
    socket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO:", reason);
      setActiveUsers([]);
      setCursors([]);
    });
    socket.on("cursor-update", (data) => {
      console.log("[cursor-update]", data);
      setCursors((prev) => {
        const filtered = prev.filter((cursor) => cursor.id !== data.id);
        return [...filtered, { ...data, lastActive: Date.now() }];
      });
      setActiveUsers((prev) => {
        const withoutUser = prev.filter((u) => u.userId !== data.id);
        const isPresent = prev.some((u) => u.userId === data.id);
        if (!isPresent) {
          return [
            ...withoutUser,
            {
              userId: data.id,
              name: data.name,
              avatar: data.imageUrl,
              color: data.color,
              lastActive: Date.now(),
            },
          ];
        }
        return prev.map((u) =>
          u.userId === data.id ? { ...u, lastActive: Date.now() } : u
        );
      });
    });
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("cursor-update");
      window.removeEventListener("mousemove", handleMouseMove);
      if (slug) socket.emit("leave-gallery", slug);
      setActiveUsers([]);
      setCursors([]);
    };
  }, [user, slug, handleMouseMove]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        return prev.filter((cursor) => now - cursor.lastActive < 15000);
      });
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!slug || !user) return;
    const channelName = `presence-gallery-${slug}`;
    if (pusherClient.channel(channelName)) {
      pusherClient.unsubscribe(channelName);
    }
    const channel = pusherClient.subscribe(channelName);
    channel.bind("image-uploaded", (data: { imageId: number; url: string }) => {
      console.log("New image uploaded:", data);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    });
    channel.bind(
      "image-starred",
      (data: { imageId: number; isStarred: boolean; userId: string }) => {
        console.log("Image starred/unstarred:", data);
        queryClient.invalidateQueries([`/api/galleries/${slug}`]);
        queryClient.invalidateQueries([`/api/images/${data.imageId}/stars`]);
      }
    );
    channel.bind("comment-added", (data: { imageId: number; content: string }) => {
      console.log("New comment added:", data);
      queryClient.invalidateQueries([`/api/images/${data.imageId}/comments`]);
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    });
    channel.bind("pusher:subscription_succeeded", (members: any) => {
      const activeMembers: any[] = [];
      const currentUserId = user?.id;
      members.each((member: any) => {
        if (member.id === currentUserId) return;
        activeMembers.push({
          userId: member.id,
          name: member.info?.name || "Anonymous",
          avatar: member.info?.avatar || "/fallback-avatar.png",
          lastActive: new Date().toISOString(),
        });
      });
      setActiveUsers(activeMembers);
    });
    channel.bind("pusher:member_added", (member: any) => {
      if (member.id === user?.id) return;
      setActiveUsers((prev) => {
        if (prev.some((u) => u.userId === member.id)) return prev;
        return [
          ...prev,
          {
            userId: member.id,
            name: member.info?.name || "Anonymous",
            avatar: member.info?.avatar || "/fallback-avatar.png",
            color: member.info?.color || "#ccc",
            lastActive: new Date().toISOString(),
          },
        ];
      });
    });
    channel.bind("pusher:member_removed", (member: any) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== member.id));
    });
    return () => {
      setActiveUsers([]);
      channel.unbind_all();
      channel.unsubscribe();
      pusherClient.unsubscribe(channelName);
    };
  }, [slug, user, queryClient]);

  // Guest upload logic
  const handleGuestUpload = async (files: File[]) => {
    if (guestGalleryCount >= 1) {
      window.location.href = "/sign-up";
      return;
    }
    setGuestGalleryCount(1);
    sessionStorage.setItem("guestGalleryCount", "1");
    // (Upload logic for guests would go here)
  };

  // Toggle grid view
  const toggleGridView = () => {
    setIsMasonry(!isMasonry);
  };

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
      if (!res.ok) throw new Error("Failed to update title");
      return res.json();
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({ queryKey: [`/api/galleries/${slug}`] });
      const previousGallery = queryClient.getQueryData([`/api/galleries/${slug}`]);
      queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => ({
        ...old,
        title: newTitle,
      }));
      return { previousGallery };
    },
    onError: (err, newTitle, context) => {
      if (context?.previousGallery) {
        queryClient.setQueryData([`/api/galleries/${slug}`], context.previousGallery);
      }
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
  });

  const handleTitleUpdate = async (newTitle: string) => {
    try {
      await titleUpdateMutation.mutateAsync(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  // Toggle star mutation
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
      )
        return;
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
      const previousGallery = queryClient.getQueryData([`/api/galleries/${slug}`]);
      // Optimistically update selected image star status
      setSelectedImage((prev) =>
        prev?.id === imageId ? { ...prev, userStarred: !isStarred } : prev
      );
      queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          images: old.images.map((img: any) =>
            img.id === imageId ? { ...img, userStarred: !isStarred } : img
          ),
        };
      });
      return { previousGallery };
    },
    onError: (err, variables, context) => {
      if (context?.previousGallery) {
        queryClient.setQueryData([`/api/galleries/${slug}`], context.previousGallery);
      }
      toast({
        title: "Error",
        description: "Failed to update star status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
  });

  // Reorder images mutation
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
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
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

  // Delete images mutation
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
    onSuccess: (_, imageIds) => {
      queryClient.setQueryData(
        [`/api/galleries/${slug}`],
        (old: GalleryType | undefined) => {
          if (!old) return old;
          return {
            ...old,
            images: old.images.filter(
              (img: Image) => !imageIds.includes(img.id)
            ),
          };
        }
      );
      setSelectedImages([]);
      setSelectMode(false);
      toast({
        title: "Success",
        description: "Selected images deleted successfully",
      });
      queryClient.invalidateQueries([`/api/galleries/${slug}`]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete images. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create comment mutation
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
      queryClient.invalidateQueries([`/api/images/${selectedImage?.id}/comments`]);
      setNewCommentPos(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add comment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Toggle visibility mutation
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
      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => {
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

  // Upload logic using your UploadContext
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
          files: [{ name: file.name, type: file.type, size: file.size }],
        }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");
      const { urls } = await response.json();
      const { signedUrl, publicUrl, imageId } = urls[0];
      setImages((prev) =>
        prev.map((img) =>
          img.id === tmpId
            ? { ...img, id: imageId, status: "uploading", progress: 0 }
            : img
        )
      );
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const progress = (ev.loaded / ev.total) * 100;
            setImages((prev) =>
              prev.map((img) => (img.id === imageId ? { ...img, progress } : img))
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
      const img = new Image();
      img.onload = () => {
        setImages((prev) =>
          prev.map((item) =>
            item.id === imageId
              ? { ...item, status: "finalizing", progress: 100 }
              : item
          )
        );
        const pollForFinalImage = async (attempt = 0, maxAttempts = 5) => {
          if (attempt >= maxAttempts) {
            setImages((prev) =>
              prev.map((item) =>
                item.id === imageId ? { ...item, status: "error" } : item
              )
            );
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            await queryClient.invalidateQueries([`/api/galleries/${slug}`]);
            const galleryData = await queryClient.getQueryData([`/api/galleries/${slug}`]);
            const serverImage = galleryData?.images?.find((img: any) => img.id === imageId);
            if (serverImage) {
              setImages((prev) =>
                prev.map((item) =>
                  item.id === imageId ? { ...serverImage, status: "complete" } : item
                )
              );
              return;
            }
            await pollForFinalImage(attempt + 1, maxAttempts);
          } catch (error) {
            await pollForFinalImage(attempt + 1, maxAttempts);
          }
        };
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
          img.id === tmpId ? { ...img, status: "error", progress: 0 } : img
        )
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
          setImages((prev) => [...prev, newItem]);
          uploadSingleFile(file, tmpId);
        };
        imageEl.src = localUrl;
      });
    },
    [uploadSingleFile]
  );

  // Selection and deletion handlers
  const handleImageSelect = (imageId: number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (!selectMode) return;
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDeleteSelected = () => {
    deleteImagesMutation.mutate(selectedImages);
  };

  const handleDownloadSelected = async (quality: "original" | "optimized" = "original") => {
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of selected images...",
      });
      const zip = new JSZip();
      const imagePromises = selectedImages.map(async (imageId) => {
        const image = gallery!.images.find((img) => img.id === imageId);
        if (!image) return;
        const imageUrl = quality === "original" ? image.url : image.url;
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

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedImages([]);
      setIsReorderMode(false);
    }
    setSelectMode(!selectMode);
  };

  const handleDragEnd = useCallback(
    (event: PointerEvent | MouseEvent | TouchEvent, draggedIndex: number, info: PanInfo) => {
      setDraggedItemIndex(null);
      setDragPosition(null);
      if (!gallery || !isReorderMode) return;
      const galleryItems = Array.from(document.querySelectorAll(".image-container"));
      if (galleryItems.length === 0 || draggedIndex >= galleryItems.length) return;
      let targetIndex = draggedIndex;
      let closestDistance = Infinity;
      const cursorPos = {
        x: event instanceof MouseEvent
          ? event.clientX
          : "touches" in event
          ? event.touches[0].clientX
          : info.point.x,
        y: event instanceof MouseEvent
          ? event.clientY
          : "touches" in event
          ? event.touches[0].clientY
          : info.point.y,
      };
      galleryItems.forEach((item, index) => {
        if (index === draggedIndex) return;
        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(centerX - cursorPos.x, centerY - cursorPos.y);
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
    [gallery, isReorderMode, queryClient, reorderImageMutation, slug]
  );

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // (Your dark mode logic here)
  };

  const preloadImage = useCallback((image: Image, imageId: number) => {
    const img = new Image();
    img.src = image.url; // Replace with getR2Image if needed
    img.onload = () => {
      setPreloadedImages((prev) => new Set([...Array.from(prev), imageId]));
    };
  }, []);

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
        const response = await fetch(image.url);
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

  const preloadAdjacentImages = (index: number) => {
    if (!gallery?.images) return;
    const preloadCount = 2;
    const imgs = gallery.images;
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = (index + i) % imgs.length;
      const prevIndex = (index - i + imgs.length) % imgs.length;
      [nextIndex, prevIndex].forEach((idx) => {
        if (imgs[idx]?.url) {
          const img = new Image();
          img.src = imgs[idx].url;
        }
      });
    }
  };

  const handleImageClick = (index: number) => {
    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
      return;
    }
    setSelectedImageIndex(index);
    preloadAdjacentImages(index);
  };

  const handleImageComment = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommentPlacementMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setNewCommentPos({ x, y });
    setIsCommentModalOpen(true);
  };

  const renderCommentDialog = () => {
    if (!isCommentModalOpen) return null;
    return (
      <CommentModal
        isOpen={isCommentModalOpen}
        position={newCommentPos!}
        onClose={() => {
          setIsCommentModalOpen(false);
          setNewCommentPos(null);
        }}
        onSubmit={(content) => {
          if (!user || !selectedImage?.id || !newCommentPos) return;
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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectMode) {
        e.preventDefault();
        setSelectedImages([]);
        setSelectMode(false);
        return;
      }
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectMode]);

  useEffect(() => {
    if (selectedImageIndex >= 0) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (!gallery?.images?.length) return;
        if (e.key === "ArrowLeft") {
          setSelectedImageIndex((prev) =>
            prev <= 0 ? gallery.images.length - 1 : prev - 1
          );
        } else if (e.key === "ArrowRight") {
          setSelectedImageIndex((prev) =>
            prev >= gallery.images.length - 1 ? 0 : prev + 1
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
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImageIndex, gallery?.images?.length, selectedImage, toggleStarMutation]);

  useEffect(() => {
    const headerActions = (
      <GalleryHeader
        gallery={gallery}
        onGridToggle={toggleGridView}
        onShare={() => setIsOpenShareModal(true)}
        onHeaderActionsChange={onHeaderActionsChange}
      />
    );
    onHeaderActionsChange?.(headerActions);
  }, [gallery, onHeaderActionsChange, toggleGridView]);

  if (isPrivateGallery) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md border-destructive">
          <div className="flex justify-center">
            <span className="text-4xl">🔒</span>
          </div>
          <AlertTitle className="text-2xl mb-2">Private Gallery</AlertTitle>
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
          <div className="flex justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <AlertTitle className="text-2xl mb-2">Gallery Not Found</AlertTitle>
          <AlertDescription className="text-base mb-4">
            {error instanceof Error
              ? error.message
              : "The gallery you are looking for does not exist or has been removed."}
          </AlertDescription>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
            Return to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  if (!gallery && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <span className="animate-spin">⏳</span>
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

  return (
    <UploadProvider>
      <>
        <CursorOverlay cursors={cursors} />
        {gallery && <GalleryActions gallery={gallery} />}
        <Helmet>
          <meta property="og:title" content={gallery.title || "Beam Gallery"} />
          <meta property="og:description" content="Explore stunning galleries!" />
          <meta
            property="og:image"
            content={
              gallery.ogImageUrl
                ? gallery.ogImage.url
                : `${import.meta.env.VITE_R2_PUBLIC_URL}/default-og.jpg`
            }
          />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={window.location.href} />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
        <div className={cn("relative w-full flex-1", isDark ? "bg-black/90" : "bg-background")}>
          <UploadDropzone canUpload={userRole === "owner" || userRole === "Edit"} onDrop={onDrop} />
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            {gallery &&
              gallery.images.length === 0 &&
              images.filter((i) => "localUrl" in i).length === 0 && (
                <div className="my-8 text-center">
                  <span className="text-6xl">📤</span>
                  <h3 className="text-lg font-medium text-foreground mb-2">No images yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop images here to start your gallery
                  </p>
                </div>
              )}
            <AnimatePresence mode="wait">
              <GalleryGrid
                images={processedImages}
                onImageClick={handleImageClick}
                isMasonry={isMasonry}
                selectMode={selectMode}
                selectedImages={selectedImages}
                onImageSelect={handleImageSelect}
                toggleStar={(imageId, isStarred) =>
                  toggleStarMutation.mutate({ imageId, isStarred })
                }
              />
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
                transition: { type: "spring", stiffness: 300, damping: 25 },
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
              className="w-[150px]"
              aria-label="Adjust gallery scale"
            />
          </div>
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
                  const allImageIds = gallery?.images?.map((img) => img.id) || [];
                  setSelectedImages(allImageIds);
                }}
                onDelete={handleDeleteSelected}
                onDownload={handleDownloadSelected}
                onEdit={handleEditSelected}
                onReorder={() => setIsReorderMode(!isReorderMode)}
              />
            )}
          </AnimatePresence>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
          <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
        </div>
        {selectedImage && !isMobile && (
          <LightboxModal
            isOpen={selectedImageIndex >= 0}
            selectedImage={selectedImage}
            onClose={() => {
              setSelectedImageIndex(-1);
              setNewCommentPos(null);
            }}
            onNavigate={(newIndex) => {
              setSelectedImageIndex(newIndex);
              preloadAdjacentImages(newIndex);
            }}
            onImageComment={handleImageComment}
            annotations={annotations}
            comments={comments}
            toggleAnnotations={() => setShowAnnotations(!showAnnotations)}
            isAnnotationsVisible={showAnnotations}
            onStarToggle={(imageId, isStarred) =>
              toggleStarMutation.mutate({ imageId, isStarred })
            }
            imageDimensions={imageDimensions}
            setImageDimensions={setImageDimensions}
          />
        )}
        {newCommentPos && selectedImage && renderCommentDialog()}
        <ShareModal
          isOpen={isOpenShareModal}
          onClose={() => setIsOpenShareModal(false)}
          isPublic={gallery?.isPublic || false}
          onVisibilityChange={(checked) => toggleVisibilityMutation.mutate(checked)}
          galleryUrl={window.location.href}
          slug={slug}
        />
      </>
    </UploadProvider>
  );
}
