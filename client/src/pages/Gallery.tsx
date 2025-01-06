import { Switch, Route, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import {
  Upload,
  Grid,
  LayoutGrid,
  Filter,
  ArrowBigUp,
  MessageSquare,
  SquareDashedMousePointer,
  Link,
  Download,
  MoreVertical,
  Star,
  Trash2,
  CheckCircle,
  Loader2,
  Moon,
  Sun,
  Share2,
  Share,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  MessageCircle,
  PencilRuler,
  Eye,
  EyeOff
} from "lucide-react";

// UI Components
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import LightboxDialogContent from "@/components/dialog/LightboxDialogContent";
import { StarredUsersFilter } from "@/components/StarredUsersFilter";
import { Progress } from "@/components/ui/progress";
import { Switch as SwitchComponent } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useDropzone } from 'react-dropzone';
import { Textarea } from "@/components/ui/textarea";

  


import { Label } from "@/components/ui/label";
import { MobileGalleryView } from "@/components/MobileGalleryView";
import type { Image, Gallery as GalleryType, Comment, Annotation, UploadProgress } from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ShareModal } from "@/components/ShareModal";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { useAuth } from "@clerk/clerk-react";
import { CommentModal } from "@/components/CommentModal";
import { useUser, useClerk, SignedIn, SignedOut } from '@clerk/clerk-react';
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/LoginModal";
import { StarredAvatars } from "@/components/StarredAvatars";
import { LoginButton } from "@/components/LoginButton";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { SignUpModal } from "@/components/SignUpModal";
import PusherClient from "pusher-js";

// Initialize Pusher client
const pusherClient = new PusherClient(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  appId: import.meta.env.VITE_PUSHER_APP_ID,
  authEndpoint: "/pusher/auth",
  forceTLS: true,
  encrypted: true,
  withCredentials: true,
  enabledTransports: ["ws", "wss", "xhr_streaming", "xhr_polling"],
  disabledTransports: []
});

// Validate required environment variables
if (!import.meta.env.VITE_PUSHER_KEY || !import.meta.env.VITE_PUSHER_CLUSTER || !import.meta.env.VITE_PUSHER_APP_ID) {
  console.error('Missing required Pusher environment variables');
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

export default function Gallery({ slug: propSlug, title, onHeaderActionsChange }: GalleryProps) {
  // URL Parameters and Global Hooks
  const params = useParams();
  const slug = propSlug || params?.slug;
  const [presenceMembers, setPresenceMembers] = useState<{[key: string]: any}>({});
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const { session } = useClerk();

  // Refresh Clerk session if expired
  useEffect(() => {
    if (session?.status === 'expired') {
      session
        .refresh()
        .then(() => console.log('Clerk session refreshed successfully'))
        .catch((error) => console.error('Failed to refresh Clerk session:', error));
    }
  }, [session]);

  // Log active users when they change
  useEffect(() => {
    console.log("Active Users:", activeUsers.map(user => ({
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      lastActive: user.lastActive
    })));
  }, [activeUsers]);

  // Pusher presence channel subscription
  useEffect(() => {
    if (!slug) return;

    const channelName = `presence-gallery-${slug}`;
    console.log('Attempting to subscribe to channel:', channelName);
    
    const channel = pusherClient.subscribe(channelName);
    console.log('Channel details:', {
      name: channel.name,
      state: channel.state,
      subscribed: channel.subscribed,
    });

    channel.bind('pusher:subscription_succeeded', (members: any) => {
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
          lastActive: new Date().toISOString()
        });
      });

      console.log('Subscription succeeded:', {
        channelName: channel.name,
        totalMembers: members.count,
        currentUserId: members.myID,
        activeMembers
      });

      setPresenceMembers(members.members);
      setActiveUsers(activeMembers);
    });

    channel.bind('pusher:subscription_error', (status: any) => {
      console.error('Subscription error:', {
        status,
        channel: channel.name,
        state: channel.state,
        responseStatus: status?.status,
        responseText: status?.error,
        timestamp: new Date().toISOString()
      });

      if (status?.status === 200) {
        console.log('Unexpected HTML Response from Auth:', status.error);
      }
    });

    channel.bind('pusher:member_added', (member: any) => {
      console.log('Member added:', member);
      
      // Skip if this is the current user
      if (member.id === user?.id) return;
      
      setActiveUsers(prev => {
        const isPresent = prev.some(user => user.userId === member.id);
        if (isPresent) return prev;

        const userInfo = member.info || {};
        return [
          ...prev,
          {
            userId: member.id,
            name: userInfo.name || "Anonymous",
            avatar: userInfo.avatar || "/fallback-avatar.png",
            lastActive: new Date().toISOString()
          }
        ];
      });
    });

    channel.bind('pusher:member_removed', (member: any) => {
      console.log('Member removed:', {
        id: member.id,
        channelData: member
      });
      setActiveUsers(prev => prev.filter(user => user.user_id !== member.id));
    });

    return () => {
      console.log('Cleaning up Pusher subscription');
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [slug]);
  const { toast } = useToast();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0
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
      uploadMutation.mutate(files);
    }
  };

  
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { isDark } = useTheme();

  const toggleGridView = () => {
    setIsMasonry(!isMasonry);
  };

  // State Management
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(100);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [showFilename, setShowFilename] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isMasonry, setIsMasonry] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [showWithComments, setShowWithComments] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error('Failed to update title');
      }

      return res.json();
    },
    onMutate: async (newTitle) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/galleries/${slug}`] });
      await queryClient.cancelQueries({ queryKey: ['/api/galleries'] });

      // Snapshot the previous values
      const previousGallery = queryClient.getQueryData([`/api/galleries/${slug}`]);
      const previousGalleries = queryClient.getQueryData(['/api/galleries']);

      // Optimistically update both caches
      queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => ({
        ...old,
        title: newTitle
      }));

      queryClient.setQueryData(['/api/galleries'], (old: any) => {
        if (!old) return old;
        return old.map((gallery: any) =>
          gallery.slug === slug ? { ...gallery, title: newTitle } : gallery
        );
      });

      return { previousGallery, previousGalleries };
    },
    onError: (err, newTitle, context) => {
      // Revert to previous values on error
      if (context?.previousGallery) {
        queryClient.setQueryData([`/api/galleries/${slug}`], context.previousGallery);
      }
      if (context?.previousGalleries) {
        queryClient.setQueryData(['/api/galleries'], context.previousGalleries);
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
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
    },
  });

  // Title update handler
  const handleTitleUpdate = async (newTitle: string) => {
    try {
      await titleUpdateMutation.mutateAsync(newTitle);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  // Queries
  const { data: gallery, isLoading, error } = useQuery<GalleryType>({
    onSuccess: (data) => {
      console.log('Gallery Data:', {
        galleryId: data?.id,
        imageCount: data?.images?.length,
        sampleStars: data?.images?.[0]?.stars,
      });
    },
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      console.log('Starting gallery fetch for slug:', slug, {
        hasToken: !!await getToken(),
        timestamp: new Date().toISOString()
      });
      
      const token = await getToken();
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/galleries/${slug}`, {
        headers,
        cache: 'no-store',
        credentials: 'include'
      });

      if (!res.ok) {
        console.error('Gallery fetch failed:', {
          status: res.status,
          statusText: res.statusText
        });
        if (res.status === 403) {
          throw new Error('This gallery is private');
        }
        if (res.status === 404) {
          throw new Error('Gallery not found');
        }
        throw new Error('Failed to fetch gallery');
      }

      const data = await res.json();
      console.log('Gallery fetch response:', {
        status: res.status,
        ok: res.ok,
        data,
        hasImages: data?.images?.length > 0,
        timestamp: new Date().toISOString()
      });
      
      if (!data) {
        throw new Error('Gallery returned null or undefined');
      }

      if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Invalid gallery data format');
      }

      return data;
    },
    enabled: !!slug,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: (err) => {
      console.error('Gallery query error:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load gallery",
        variant: "destructive"
      });
    }
  });

  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  useEffect(() => {
    setSelectedImage(gallery?.images?.[selectedImageIndex] ?? null);
  }, [selectedImageIndex, gallery?.images]);

  

  const { data: annotations = [] } = useQuery<Annotation[]>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });

  const { data: comments = [], isLoading: isCommentsLoading, error: commentsError } = useQuery<Comment[]>({
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
          id: comment.userId || 'unknown',
          username: comment.userName || 'Unknown User',
          imageUrl: comment.userImageUrl || undefined
        }
      }));
    }
  });

  // Define all mutations first
  const toggleStarMutation = useMutation({
    mutationFn: async ({ imageId, isStarred }: { imageId: number, isStarred: boolean }) => {
      const token = await getToken();
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: isStarred ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include'
      });

      const result = await res.json();
      if (!res.ok || result?.success === false) {
        throw new Error(result.message || 'Failed to update star status');
      }

      return { ...result, imageId };
    },
    onMutate: async ({ imageId, isStarred }) => {
      await queryClient.cancelQueries([`/api/galleries/${slug}`]);
      await queryClient.cancelQueries([`/api/images/${imageId}/stars`]);
      const previousGallery = queryClient.getQueryData([`/api/galleries/${slug}`]);
      const previousStars = queryClient.getQueryData([`/api/images/${imageId}/stars`]);

      // Update Lightbox Image (if open)
      setSelectedImage((prev) =>
        prev?.id === imageId ? { ...prev, userStarred: !isStarred } : prev
      );

      // Update Gallery Grid
      queryClient.setQueryData([`/api/galleries/${slug}`], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          images: oldData.images.map((image: any) =>
            image.id === imageId ? { ...image, userStarred: !isStarred } : image
          ),
        };
      });

      // Update stars data
      queryClient.setQueryData([`/api/images/${imageId}/stars`], (old: any) => {
        if (!old) return { success: true, data: [] };
        const updatedData = isStarred
          ? old.data.filter((star: any) => star.userId !== user?.id)
          : [...old.data, {
              userId: user?.id,
              imageId,
              user: {
                firstName: user?.firstName,
                lastName: user?.lastName,
                imageUrl: user?.imageUrl
              }
            }];
        return { ...old, data: updatedData };
      });

      return { previousGallery, previousStars };
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds })
      });
      if (!response.ok) throw new Error('Failed to delete images');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData([`/api/galleries/${slug}`], (oldData: GalleryType | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          images: oldData.images.filter(
            (image: Image) => !variables.includes(image.id)
          ),
        };
      });

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
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      const formData = new FormData();

      const progressMap: UploadProgress = {};
      files.forEach((file) => {
        formData.append("images", file);
        progressMap[file.name] = 0;
      });
      setUploadProgress(progressMap);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              Object.keys(newProgress).forEach(key => {
                newProgress[key] = progress;
              });
              return newProgress;
            });
          }
        };

        xhr.open('POST', `/api/galleries/${slug}/images`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.response);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      queryClient.refetchQueries({ queryKey: [`/api/galleries/${slug}`] });
      setIsUploading(false);
      setUploadProgress({});
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress({});
      toast({
        title: "Error",
        description: `Failed to upload images: ${error.message}`,
        variant: "destructive",
      });
    },
  });

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
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          xPosition: x,
          yPosition: y
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create comment');
      }

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/images/${selectedImage?.id}/comments`] });
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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (!res.ok) {
        throw new Error('Failed to update visibility');
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      uploadMutation.mutate(acceptedFiles);
    },
    [uploadMutation]
  );

  // Modify the useDropzone configuration to disable click
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading || selectMode || selectedImageIndex >= 0,
    noClick: true,
    noKeyboard: true
  });

  // Add upload progress placeholders to the masonry grid
  const renderUploadPlaceholders = () => {
    if (!Object.keys(uploadProgress).length) return null;

    return Object.entries(uploadProgress).map(([filename, progress]) => (
      <motion.div
        key={filename}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-zinc-900 rounded-lg overflow-hidden relative"
      >
        <div className="w-full aspect-[4/3] flex items-center justify-center">
          <span className="text-sm font-geist-mono font-medium text-zinc-500/80">{filename}</span>
        </div>
        <div className="absolute inset-0 flex flex-col justify-end">
          <Progress value={progress} className="h-1" />
        </div>
      </motion.div>
    ));
  };

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
    [scale]
  );

  // Preload image function
  const preloadImage = useCallback((url: string, imageId: number) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setPreloadedImages(prev => new Set([...Array.from(prev), imageId]));
    };
  }, []);

  // Preload images when gallery data is available
  useEffect(() => {
    if (gallery?.images) {
      gallery.images.forEach(image => {
        if (!preloadedImages.has(image.id)) {
          preloadImage(image.url, image.id);
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
        const extension = image.url.split('.').pop() || 'jpg';
        zip.file(`image-${index + 1}.${extension}`, blob);
      });

      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${gallery!.title || 'gallery'}-images.zip`);

      toast({
        title: "Success",
        description: "Images downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
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

    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDeleteSelected = () => {
    deleteImagesMutation.mutate(selectedImages);
  };

  const handleDownloadSelected = async () => {
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of selected images...",
      });

      const zip = new JSZip();
      const imagePromises = selectedImages.map(async (imageId) => {
        const image = gallery!.images.find(img => img.id === imageId);
        if (!image) return;
        
        const response = await fetch(image.url);
        const blob = await response.blob();
        const extension = image.url.split('.').pop() || 'jpg';
        zip.file(`image-${imageId}.${extension}`, blob);
      });

      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `selected-images.zip`);

      toast({
        title: "Success",
        description: "Selected images downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
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

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
  };

  const handleDragEnd = useCallback((
    event: PointerEvent | MouseEvent | TouchEvent,
    draggedIndex: number,
    info: PanInfo
  ) => {
    setDraggedItemIndex(null);
    setDragPosition(null);

    if (!gallery || !isReorderMode) return;

    const galleryItems = Array.from(document.querySelectorAll(".image-container"));
    if (galleryItems.length === 0 || draggedIndex >= galleryItems.length) return;

    let targetIndex = draggedIndex;
    let closestDistance = Infinity;

    // Get cursor position at drag end
    const cursorPos = {
      x: event instanceof MouseEvent ? event.clientX :
        'touches' in event && event.touches[0] ? event.touches[0].clientX :
        info.point.x,
      y: event instanceof MouseEvent ? event.clientY :
        'touches' in event && event.touches[0] ? event.touches[0].clientY :
        info.point.y
    };

    // Find closest drop target by comparing centers
    galleryItems.forEach((item, index) => {
      if (index === draggedIndex) return;

      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate Euclidean distance to find closest drop target
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

      // Optimistic update for immediate visual feedback
      queryClient.setQueryData([`/api/galleries/${slug}`], {
        ...gallery,
        images: updatedImages,
      });

      // Server update
      reorderImageMutation.mutate(updatedImages.map(img => img.id));
    }
  }, [gallery, isReorderMode, queryClient, reorderImageMutation, slug]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Add your dark mode logic here, e.g., toggle a class on the body element
  };

  const [selectedStarredUsers, setSelectedStarredUsers] = useState<string[]>([]);

const getUniqueStarredUsers = useMemo(() => {
  if (!gallery?.images) return [];
  const usersSet = new Set<string>();
  const users: { userId: string; firstName: string | null; lastName: string | null; imageUrl: string | null; }[] = [];
  
  gallery.images.forEach(image => {
    image.stars?.forEach(star => {
      if (!usersSet.has(star.userId)) {
        usersSet.add(star.userId);
        users.push({
          userId: star.userId,
          firstName: star.firstName || null,
          lastName: star.lastName || null,
          imageUrl: star.imageUrl || null
        });
      }
    });
  });
  
  return users;
}, [gallery?.images]);

const renderGalleryControls = useCallback(() => {
    if (!gallery) return null;

    return (
      <div className={cn("flex items-center justify-between gap-2 p-2 rounded-lg", isDark ? "bg-black/90" : "bg-white/90")}>
        <div className="flex items-center gap-4">
          {/* Presence Avatars */}
          <div className="flex -space-x-2">
            {activeUsers.map((member) => (
              <UserAvatar
                key={member.userId}
                name={member.name}
                imageUrl={member.avatar}
                isActive={true}
                className="w-8 h-8 border-2 border-white/40 dark:border-black hover:translate-y-[-2px] transition-transform"
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
        
          {/* Grid View Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleGridView}
                className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-zinc-800 hover:bg-zinc-200", !isMasonry && "bg-primary/20")}
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

          {/* Filter Menu - Temporarily commented out
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-zinc-800 hover:bg-zinc-200")}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setShowStarredOnly(!showStarredOnly)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <Star className={cn("w-4 h-4 mr-2", showStarredOnly ? "fill-yellow-400 text-yellow-400" : isDark ? "text-white" : "text-zinc-800")} />
                        Show Starred
                        <div className="ml-auto inline-flex items-center gap-1">
                          <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                            <ArrowBigUp className="h-3 w-3" />
                          </kbd>
                          <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                            S
                          </kbd>
                        </div>
                      </div>
                      {showStarredOnly && <CheckCircle className={cn("w-4 h-4 text-primary")} />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowWithComments(!showWithComments)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <MessageSquare className={cn("w-4 h-4 mr-2", showWithComments ? "text-primary" : isDark ? "text-white" : "text-zinc-800")} />
                        Show Comments
                        <div className="ml-auto inline-flex items-center gap-1">
                          <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                            <ArrowBigUp className="h-3 w-3" />
                          </kbd>
                          <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                            C
                          </kbd>
                        </div>
                      </div>
                      {showWithComments && <CheckCircle className={cn("w-4 h-4 text-primary")} />}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setShowStarredOnly(false);
                      setShowWithComments(false);
                      }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      Reset Filters
                      <div className="ml-auto inline-flex items-center gap-1">
                        <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                          <ArrowBigUp className="h-3 w-3" />
                        </kbd>
                        <kbd className="inline-flex h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium">
                          R
                        </kbd>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>Filter Images</TooltipContent>
          </Tooltip>
          */}

          {isUploading && (
            <div className="flex items-center gap-4">
              <Progress value={undefined} className="w-24" />
              <span className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>Uploading...</span>
            </div>
          )}

          {selectMode && (
            <>
              

              
            </>
          )}


          {/* Share Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200")}
                onClick={() => setIsOpenShareModal(true)}
              >
                <Share className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share Gallery</TooltipContent>
          </Tooltip>

          
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
                    : "text-gray-800 hover:bg-gray-200 data-[state=on]:bg-accent/30 data-[state=on]:text-accent-foreground data-[state=on]:ring-2 data-[state=on]:ring-accent"
                )}
              >
                <PencilRuler className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>{selectMode ? "Done" : "Select Images"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }, [
    gallery,
    isUploading,
    selectMode,
    isReorderMode,
    selectedImages.length,
    showStarredOnly,
    showWithComments,
    deleteImagesMutation,
    toggleReorderMode,
    toggleSelectMode,
    setIsOpenShareModal
  ]);

  const renderImage = (image: Image, index: number) => (
    <motion.div
      key={image.id}
      layout={draggedItemIndex === index ? false : "position"}
      className={`mb-4 image-container relative ${
        !isMasonry ? 'aspect-[4/3]' : ''
      } transform transition-all duration-200 ease-out ${
        isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      initial={{ opacity: 0, y: 20}}      animate={{
        opacity: preloadedImages.has(image.id) ? 1 : 0,
        y: 0,
        scale: draggedItemIndex === index ? 1.1 : 1,
        zIndex: draggedItemIndex === index ? 100 : 1,
        transition: {
          duration: draggedItemIndex === index ? 0 : 0.25,
        }
      }}
      style={{
        position: draggedItemIndex === index ? "absolute" : "relative",
        top: draggedItemIndex === index ? dragPosition?.y : "auto",
        left: draggedItemIndex === index ? dragPosition?.x : "auto",
      }}
      drag={isReorderMode}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => setDraggedItemIndex(index)}
      onDrag={(_, info) => {
        setDragPosition({ x: info.point.x, y: info.point.y });
      }}
      onDragEnd={(event, info) => handleDragEnd(event as PointerEvent, index, info)}
    >
      <div
        className={`group relative bg-card rounded-lg overflow-hidden transform transition-all ${
          !isReorderMode ? 'hover:scale-[1.02] cursor-pointer' : ''
        } ${selectMode ? 'hover:scale-100' : ''} ${
          isReorderMode ? 'border-2 border-dashed border-gray-200 border-opacity-50' : ''
        }`}
        onClick={(e) => {
          if (isReorderMode) {
            e.stopPropagation();
            return;
          }
          selectMode ? handleImageSelect(image.id, e) : handleImageClick(index);
        }}
      >
        {preloadedImages.has(image.id) && (
          <>
            <img
              src={getCloudinaryUrl(image.publicId, 'w_600,h_400,c_fill,q_auto,f_auto')}
              alt={image.originalFilename || ''}
              className={`w-full h-auto object-cover rounded-lg ${
                selectMode && selectedImages.includes(image.id) ? 'opacity-75' : ''
              } ${draggedItemIndex === index ? 'opacity-50' : ''}`}
              loading="lazy"
              draggable={false}
            />
          </>
        )}

        {/* Starred avatars in bottom left corner */}
        {!selectMode && (
          <div className="absolute bottom-2 left-2 z-10">
            <StarredAvatars imageId={image.id} />
          </div>
        )}

        {/* Star button in bottom right corner */}
        {!selectMode && (
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

                // Use image.userStarred for optimistic updates
                const hasUserStarred = image.userStarred;

                // Optimistic UI update for selected image  
                setSelectedImageIndex((prevIndex) => {
                  if (prevIndex >= 0) {
                    setSelectedImage((prev) =>
                      prev ? { ...prev, userStarred: !hasUserStarred } : prev
                    );
                  }
                  return prevIndex;
                });

                // Update gallery data optimistically
                queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => ({
                  ...old,
                  images: old.images.map((img: Image) =>
                    img.id === image.id ? { ...img, userStarred: !hasUserStarred } : img
                  )
                }));

                // Update star list optimistically
                queryClient.setQueryData([`/api/images/${image.id}/stars`], (old: any) => {
                  if (!old) return { success: true, data: [] };
                  
                  const updatedStars = hasUserStarred
                    ? old.data.filter((star: any) => star.userId !== user?.id)
                    : [
                        ...old.data,
                        {
                          userId: user?.id,
                          imageId: image.id,
                          user: {
                            firstName: user?.firstName,
                            lastName: user?.lastName,
                            imageUrl: user?.imageUrl
                          }
                        }
                      ];

                  return { ...old, data: updatedStars };
                });

                // Perform mutation to sync with backend
                toggleStarMutation.mutate(
                  { imageId: image.id, isStarred: hasUserStarred },
                  {
                    onError: () => {
                      // Revert optimistic UI
                      queryClient.setQueryData([`/api/galleries/${slug}`], (old: any) => ({
                        ...old,
                        images: old.images.map((img: Image) =>
                          img.id === image.id ? { ...img, starred: hasUserStarred } : img
                        )
                      }));

                      // Revert star list
                      queryClient.setQueryData([`/api/images/${image.id}/stars`], (old: any) => {
                        if (!old) return { success: true, data: [] };
                        return {
                          ...old,
                          data: hasUserStarred
                            ? [...old.data, {
                              userId: user?.id,
                              imageId: image.id,
                              user: {
                                firstName: user?.firstName,
                                lastName: user?.lastName,
                                imageUrl: user?.imageUrl
                              }
                            }]
                            : old.data.filter((star: any) => star.userId !== user?.id)
                        };
                      });

                      // Revert selected image if in lightbox
                      if (selectedImage?.id === image.id) {
                        setSelectedImage((prev) =>
                          prev ? { ...prev, starred: hasUserStarred } : prev
                        );
                      }

                      toast({
                        title: "Error",
                        description: "Failed to update star status. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                );
              }}
            >
              <motion.div
                animate={{
                  scale: image.starred ? 1.2 : 1,
                  opacity: image.starred ? 1 : 0.6
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

        {/* Comment count badge */}
        {!selectMode && image.commentCount! > 0 && (
          <Badge
            className="absolute top-2 right-2 bg-primary text-primary-foreground flex items-center gap-1"
            variant="secondary"
          >
            <MessageSquare className="w-3 h-3" />
            {image.commentCount}          </Badge>
        )}

        {/* Selection checkbox */}
        {selectMode && !isReorderMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 z-10"
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedImages.includes(image.id)
                  ? 'bg-primary border-primary'
                  : 'bg-background/80 border-background/80'
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
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectMode) {
        e.preventDefault();
        setSelectedImages([]);
        setSelectMode(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectMode]);

  useEffect(() => {
    if (selectedImageIndex >= 0) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!gallery?.images?.length) return;
        if (e.key === "ArrowLeft") {
          setSelectedImageIndex((prev) => (prev <= 0 ? gallery.images.length - 1 : prev - 1));
        } else if (e.key === "ArrowRight") {
          setSelectedImageIndex((prev) => (prev >= gallery.images.length - 1 ? 0 : prev + 1));
        } else if (selectedImage && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "s")) {
          toggleStarMutation.mutate({
            imageId: selectedImage.id,
            isStarred: selectedImage.userStarred
          });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImageIndex, gallery?.images?.length, selectedImage, toggleStarMutation]);

  useEffect(() => {
    const controls = renderGalleryControls();
    onHeaderActionsChange?.(controls);
  }, [onHeaderActionsChange, renderGalleryControls]);

  if (isPrivateGallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Lock className="h-12 w-12 text-muted-foreground" />
              <h1 className="text-2xl font-semibold">Private Gallery</h1>
              <p className="text-muted-foreground">
                This gallery is private and can only be accessed by its owner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-semibold">Gallery Not Found</h1>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'The gallery you are looking for does not exist or has been removed.'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gallery && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gallery && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl">Gallery not found</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-semibold">Gallery Not Found</h1>
              <p className="text-muted-foreground">
                The gallery you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gallery && gallery.images.length === 0) {
    return (
      <div className="flex flex-col min-h-screen max-h-screen overflow-hidden">
        <div className="flex-1 w-full overflow-hidden relative">
          <SignedIn>
            <div className="absolute inset-0">
              <UploadDropzone 
                onUpload={(files) => {
                  if (!files.length) return;
                  uploadMutation.mutate(files);
                }}
                imageCount={gallery?.images?.length || 0}
              />
            </div>
          </SignedIn>
          <SignedOut>
            <div className="absolute inset-0">
              <UploadDropzone onUpload={handleGuestUpload} />
            </div>
          </SignedOut>
        </div>
      </div>
    );
  }

  // Modify the image click handler in the gallery grid
  const handleImageClick = (index: number) => {
    console.log('handleImageClick:', { isCommentPlacementMode }); // Debug log

    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
      return;
    }

    setSelectedImageIndex(index);
  };

  

  // Add comment position handler
  const handleImageComment = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log('handleImageComment triggered'); // Debug log
    if (!isCommentPlacementMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log('Setting comment position:', { x, y }); // Debug log
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
          console.log('Comment modal closed'); // Debug log
        }}
        onSubmit={(content) => {
          if (!user) {
            console.log('User not authenticated, cannot submit comment'); // Debug log
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
    <div className={cn("min-h-screen relative", isDark ? "bg-black/90" : "bg-background")} {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && !selectMode && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white">Drop images here</h3>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-4">
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
                breakpointCols={breakpointCols}
                className="flex -ml-4 w-[calc(100%+1rem)] masonrygrid"
                columnClassName={cn("pl-4", isDark ? "bg-black/90" : "bg-background")}
              >
                {renderUploadPlaceholders()}
                {gallery?.images
                  .filter((image: Image) => {
                    // Apply starred filter
                    if (showStarredOnly && !image.starred) return false;
                    // Apply comments filter
                    if (showWithComments && (!image.commentCount || image.commentCount === 0)) return false;
                    // Apply user filter
                    if (selectedStarredUsers.length > 0) {
                      return image.stars?.some(star => selectedStarredUsers.includes(star.userId)) || false;
                    }
                    return true;
                  })
                  .map((image: Image, index: number) => renderImage(image, index))}
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
              {renderUploadPlaceholders()}
              {gallery?.images
                .filter((image: Image) => {
                  if (showStarredOnly && !image.starred) return false;
                  if (showWithComments && (!image.commentCount || image.commentCount === 0)) return false;
                  return true;
                })
                .map((image: Image, index: number) => renderImage(image, index))}
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
            width: '80px',
            height: '80px'
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 0.8,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 25
            }
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

      

      {/* Logo */}
      <div 
        className="fixed bottom-6 left-6 z-50 opacity-30 hover:opacity-60 transition-opacity cursor-pointer" 
        onClick={() => window.location.href = '/'}
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
        <Dialog open={selectedImageIndex >= 0} onOpenChange={(open) => {
          if (!open) {
            setSelectedImageIndex(-1);
            setNewCommentPos(null);
          }
        }}>
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
              className={cn("absolute left-4 top-1/2 -translate-y-1/2 z-50 h-9 w-9", 
                isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200")}
              onClick={() => {
                if (!gallery?.images?.length) return;
                setSelectedImageIndex((prev) => (prev <= 0 ? gallery.images.length - 1 : prev - 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("absolute right-4 top-1/2 -translate-y-1/2 z-50 h-9 w-9",
                isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200")}
              onClick={() => {
                if (!gallery?.images?.length) return;
                setSelectedImageIndex((prev) => (prev >= gallery.images.length - 1 ? 0 : prev + 1));
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
                      prev ? { ...prev, userStarred: !prev.userStarred } : prev
                    );

                    // Perform mutation to sync with backend
                    toggleStarMutation.mutate({
                      imageId: selectedImage.id,
                      isStarred: selectedImage.userStarred
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
                {/* Annotation button temporarily hidden
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200", isAnnotationMode && "bg-primary/20")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAnnotationMode(!isAnnotationMode);
                    setIsCommentPlacementMode(false);
                    setNewCommentPos(null);
                  }}
                  title="Toggle Drawing Mode"
                >
                  <Paintbrush className="h-4 w-4" />
                </Button>
                */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200")}
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  title={showAnnotations ? "Hide Comments" : "Show Comments"}
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
                    className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-zinc-800 hover:bg-zinc-200", isCommentPlacementMode && "bg-primary/20")}
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
                    className={cn("h-9 w-9", isDark ? "text-white hover:bg-white/10" : "text-zinc-800 hover:bg-zinc-200")}
                    onClick={() => setShowLoginModal(true)}
                    title="Sign in to comment"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
                </SignedOut>
              </div>
            </div>

            {/* Settings toggles removed */}

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
                    if (swipe < -100 && selectedImageIndex < gallery!.images.length - 1) {
                      setSelectedImageIndex(selectedImageIndex + 1);
                    } else if (swipe > 100 && selectedImageIndex > 0) {
                      setSelectedImageIndex(selectedImageIndex - 1);
                    }
                  }
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
                <div className="w-full h-full flex items-center justify-center">
                  {/* Image with onLoad handler */}
                  <motion.img
                    src={getCloudinaryUrl(selectedImage.publicId, 'w_1600,q_auto,f_auto')}
                    alt={selectedImage.originalFilename || ''}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({
                        width: img.clientWidth,
                        height: img.clientHeight,
                      });
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
                          await fetch(`/api/images/${selectedImage.id}/annotations`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ pathData }),
                          });

                          queryClient.invalidateQueries({
                            queryKey: [`/api/images/${selectedImage.id}/annotations`],
                          });

                          toast({
                            title: "Annotation saved",
                            description: "Your drawing has been saved successfully.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to save annotation. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Comments */}
                  {showAnnotations &&
                    comments.map((comment) => (
                      <CommentBubble
                        key={comment.id}
                        x={comment.xPosition}
                        y={comment.yPosition}
                        content={comment.content}
                        author={comment.author}
                      />
                    ))}

                  {/* New comment placement */}
                  {newCommentPos && selectedImage && (
                    <CommentBubble
                      x={newCommentPos.x}
                      y={newCommentPos.y}
                      isNew={true}
                      imageId={selectedImage.id}
                      onSubmit={() => {
                        setNewCommentPos(null);
                        queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
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
          imageId={selectedImage.id}
          onSubmit={() => {
            setNewCommentPos(null);
            queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
          }}
        />
      )}
      {/* Share Modal */}
      {isOpenShareModal && (
        <ShareModal
          isOpen={isOpenShareModal}
          onClose={() => setIsOpenShareModal(false)}
          isPublic={gallery?.isPublic || false}
          onVisibilityChange={(checked) => toggleVisibilityMutation.mutate(checked)}
          galleryUrl={window.location.href}
        />
      )}
      {renderCommentDialog()}
      
      <AnimatePresence>
        {selectMode && selectedImages.length > 0 && (
          <FloatingToolbar
            selectedCount={selectedImages.length}
            onDeselect={() => {
              setSelectedImages([]);
              setSelectMode(false);
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
  );
}