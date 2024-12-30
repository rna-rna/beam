import { Switch, Route, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Upload,
  Grid,
  LayoutGrid,
  MessageSquare,
  SquareDashedMousePointer,
  Download,
  Star,
  Trash2,
  CheckCircle,
  Loader2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  Lock,
  AlertCircle
} from "lucide-react";

// UI Components
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch as SwitchComponent } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";

// Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useDropzone } from 'react-dropzone';
import { MobileGalleryView } from "@/components/MobileGalleryView";
import type { Image, Gallery as GalleryType, Comment, Annotation } from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ShareModal } from "@/components/ShareModal";
import { useAuth } from "@clerk/clerk-react";
import { CommentModal } from "@/components/CommentModal";
import { useUser } from '@clerk/clerk-react';


interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

export default function Gallery({ slug: propSlug, title, onHeaderActionsChange }: GalleryProps) {
  // URL Parameters and Global Hooks
  const params = useParams();
  const slug = propSlug || params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();

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
  const [showApproved, setShowApproved] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOpenShareModal, setIsOpenShareModal] = useState(false);
  const [isPrivateGallery, setIsPrivateGallery] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  // Title update mutation
  const titleUpdateMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const res = await fetch(`/api/galleries/${slug}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update title');
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
        description: err instanceof Error ? err.message : "Failed to update title. Please try again.",
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
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
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
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 403) {
          throw new Error('This gallery is private');
        }
        if (res.status === 404) {
          throw new Error('Gallery not found');
        }
        throw new Error(errorText || 'Failed to fetch gallery');
      }

      return res.json();
    },
    enabled: !!slug,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const selectedImage = gallery?.images?.[selectedImageIndex] ?? null;

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
    mutationFn: async (imageId: number) => {
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to toggle star");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle star. Please try again.",
        variant: "destructive",
      });
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
        credentials: 'include'
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
      if (selectedImageIndex >= 0 || selectMode) return;
      uploadMutation.mutate(acceptedFiles);
    },
    [uploadMutation, selectedImageIndex, selectMode]
  );

  // Modify the useDropzone configuration to disable click
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading || selectMode,
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
        className="mb-4 bg-gray-200 rounded-lg overflow-hidden relative"
      >
        <div className="w-full aspect-[4/3] flex items-center justify-center">
          <span className="text-gray-500">{filename}</span>
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

  const handleImageSelect = (imageId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!selectMode) return;

    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
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

  const handleImageClick = (index: number) => {
    console.log('handleImageClick:', { isCommentPlacementMode }); // Debug log

    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
      return;
    }

    setSelectedImageIndex(index);
  };

  const toggleGridView = () => {
    setIsMasonry(!isMasonry);
  };

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


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gallery?.images?.length) return;
      if (e.key === "ArrowLeft") {
        setSelectedImageIndex((prev) => (prev <= 0 ? gallery.images.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedImageIndex((prev) => (prev >= gallery.images.length - 1 ? 0 : prev + 1));
      } else if (selectedImage && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "s")) {
        toggleStarMutation.mutate(selectedImage.id);
      }
    };

    if (selectedImageIndex >= 0) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImageIndex, gallery?.images?.length, selectedImage?.id, toggleStarMutation]);

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

  if (!gallery && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  const renderImage = (image: Image, index: number) => (
    <motion.div
      key={image.id}
      layout={draggedItemIndex === index ? false : "position"}
      className={`mb-4 image-container relative ${
        !isMasonry ? 'aspect-[4/3]' : ''
      } transform transition-all duration-200 ease-out ${
        isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{
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
        className={`relative bg-card rounded-lg overflow-hidden transform transition-all ${
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
          <img
            src={image.url}
            alt=""
            className={`w-full h-auto object-cover rounded-lg ${
              selectMode && selectedImages.includes(image.id) ? 'opacity-75' : ''            } ${draggedItemIndex === index ? 'opacity-50' : ''}`}
            loading="lazy"
            draggable={false}
          />
        )}

        {/* Move star button to bottom-left corner */}
        {!selectMode && (
          <motion.div
            className="absolute bottom-2 left-2 z-10 star-button opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 md:opacity-0 max-md:opacity-100"
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.8 }}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bgbackground/80 hover:bg-background shadow-sm backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarMutation.mutate(image.id);
              }}            >
              <motion.div
                animate={{
                  scale: image.starred ? 1.2 : 1,
                  opacity: image.starred ? 1 : 0.6
                }}
                transition={{ duration: 0.2 }}
              >
                {image.starred ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Star className="h-4 w-4" />
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
            {image.commentCount}
          </Badge>
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

  const renderFloatingToolbar = useCallback(() => {
    if (!selectMode) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-4"
      >
        <span className="text-sm font-medium">
          {selectedImages.length} selected
        </span>
        <div className="flex items-center gap-2">
          {selectedImages.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteImagesMutation.mutate(selectedImages)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedImages([]);
              setSelectMode(false);
            }}
          >
            Done
          </Button>
        </div>
      </motion.div>
    );
  }, [selectMode, selectedImages.length, deleteImagesMutation, handleDownloadAll]);

  return (
    <>
      <div className="relative min-h-screen bg-background" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive && !selectMode && (
          <div className="absolute inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center">
            <div className="bg-background p-8 rounded-lg shadow-lg text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Drop images to add to gallery</h3>
            </div>
          </div>
        )}

        {/* Mobile Gallery View */}
        {showMobileView && (
          <MobileGalleryView
            images={gallery.images}
            initialIndex={mobileViewIndex}
            onClose={() => setShowMobileView(false)}
            onStarImage={(imageId) => toggleStarMutation.mutate(imageId)}
          />
        )}

        {/* Masonry Grid */}
        <div className="p-4 md:p-6 lg:p-8">
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mb-8 space-y-4">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{filename}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              ))}
            </div>
          )}

          {gallery.images.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No images yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop images here or click to upload
              </p>
            </div>
          ) : (
            <Masonry
              breakpointCols={breakpointCols}
              className="flex gap-4"
              columnClassName="flex flex-col gap-4"
            >
              {gallery.images.map((image, index) => renderImage(image, index))}
              {renderUploadPlaceholders()}
            </Masonry>
          )}
        </div>

        {/* Share Modal */}
        <ShareModal
          open={isOpenShareModal}
          onOpenChange={setIsOpenShareModal}
          url={window.location.href}
          onCopy={handleCopyLink}
          isPublic={!isPrivateGallery}
          onVisibilityChange={(checked) => toggleVisibilityMutation.mutate(checked)}
        />

        {/* Floating Tools Toolbar */}
        {renderFloatingToolbar()}
      </div>
      {renderCommentDialog()}
    </>
  );
}