import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { MobileGalleryView } from "@/components/MobileGalleryView";
import type { Image, Gallery as GalleryType, Comment, Annotation, UploadProgress } from "@/types/gallery";
import { Upload, Grid, LayoutGrid, Filter } from "lucide-react";

// UI Components
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";

// Icons
import {
  MessageCircle,
  Paintbrush,
  Settings,
  Link,
  Star,
  Download,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  CheckCircle
} from "lucide-react";

// Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useDropzone } from 'react-dropzone';

interface ImageDimensions {
  width: number;
  height: number;
}

interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

function Gallery({ slug: propSlug, title, onHeaderActionsChange }: GalleryProps) {
  // URL Parameters and Global Hooks
  const params = useParams();
  const slug = propSlug || params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State Management
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(100);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [userName, setUserName] = useState<string>("");
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [showWithComments, setShowWithComments] = useState(false);
  const [showApproved, setShowApproved] = useState(false);

  // Add mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Queries
  const { data: gallery, isLoading, error } = useQuery<GalleryType>({
    queryKey: [`/api/galleries/${slug}`],
    enabled: !!slug
  });

  const selectedImage = gallery?.images?.[selectedImageIndex] ?? null;

  const { data: annotations = [] } = useQuery<Annotation[]>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/images/${selectedImage?.id}/comments`],
    enabled: !!selectedImage?.id,
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
      author,
      x,
      y,
    }: {
      imageId: number;
      content: string;
      author: string;
      x: number;
      y: number;
    }) => {
      const res = await fetch(`/api/images/${imageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          author: author.trim() || "Anonymous",
          xPosition: x,
          yPosition: y,
        }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/images/${selectedImage?.id}/comments`] });
      setNewCommentPos(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });


  // Callbacks
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
    noClick: true, // Disable click to upload
    noKeyboard: true // Disable keyboard interaction
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
      setIsReorderMode(false); // added to reset reorder mode when exiting select mode
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

  const renderGalleryControls = useCallback(() => {
    if (!gallery) return null;

    return (
      <div className="flex items-center gap-2">
        {/* Gallery Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <MenuIcon className="w-4 h-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleCopyLink}
                className="flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadAll}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download All
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleStarredToggle}
                className="flex items-center gap-2"
              >
                <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {showStarredOnly ? 'Show All' : 'Show Starred'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleReorderToggle}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {isReorderMode ? 'Done Reordering' : 'Reorder Images'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Menu - UPDATED SECTION */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter {(showStarredOnly || showWithComments || showApproved || showAnnotations) && '•'}
            </Button>
          </DropdownMenuTrigger>
          {renderFilterMenu()}
        </DropdownMenu>

        {isUploading && (
          <div className="flex items-center gap-4">
            <Progress value={undefined} className="w-24" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        )}

        {selectMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleReorderMode}
              className={isReorderMode ? "bg-primary text-primary-foreground" : ""}
            >
              {isReorderMode ? "Done Reordering" : "Reorder"}
            </Button>
            {selectedImages.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteImagesMutation.mutate(selectedImages)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedImages.length})
              </Button>
            )}
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectMode}
          className={selectMode ? "bg-primary text-primary-foreground" : ""}
        >
          {selectMode ? "Done" : "Select"}
        </Button>
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
    showApproved,
    showAnnotations,
    deleteImagesMutation,
    handleCopyLink,
    handleDownloadAll,
    handleStarredToggle,
    handleReorderToggle,
    toggleReorderMode,
    toggleSelectMode,
    renderFilterMenu
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
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: preloadedImages.has(image.id) ? 1 : 0,
        y: 0,
        scale: draggedItemIndex === index ? 1.1 : 1,
        zIndex: draggedItemIndex === index ? 100 : 1,
        transition: {
          duration: draggedItemIndex === index ? 0 : 0.25,  // Smooth return without stutter
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
        className={`relative bg-card rounded-lg overflow-hidden transform transition-all group ${
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
              selectMode && selectedImages.includes(image.id) ? 'opacity-75' : ''
            } ${draggedItemIndex === index ? 'opacity-50' : ''}`}
            loading="lazy"
            draggable={false}
          />
        )}

        {/* Move star button to bottom-left corner */}
        {!selectMode && (
          <motion.div
            className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-md:opacity-100"
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.8 }}  // Click animation
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarMutation.mutate(image.id);
              }}
            >
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
            <MessageCircle className="w-3 h-3" />
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

  useEffect(() => {
    if (selectedImageIndex >= 0) {
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

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImageIndex, gallery?.images?.length, selectedImage?.id, toggleStarMutation]);

  useEffect(() => {
    const controls = renderGalleryControls();
    onHeaderActionsChange?.(controls);
  }, [onHeaderActionsChange, renderGalleryControls]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Failed to load gallery</h1>
      </div>
    );
  }

  if (!gallery && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Gallery not found</h1>
      </div>
    );
  }

  // Modify the image click handler in the gallery grid
  const handleImageClick = (index: number) => {
    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
    } else {
      setSelectedImageIndex(index);
    }
  };

  // Add layout toggle handler
  const toggleGridView = () => {
    setIsMasonry(!isMasonry);
  };

  return (
    <div className="min-h-screen relative" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && !selectMode && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Drop images here</h3>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 lg:px-8 py-8">
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
                className="flex -ml-4 w-[calc(100%+1rem)] masonry-grid"
                columnClassName="pl-4 bg-background"
              >
                {renderUploadPlaceholders()}
                {gallery?.images
                  .filter((image: Image) => {
                    if (showStarredOnly && !image.starred) return false;
                    if (showWithComments && (!image.commentCount || image.commentCount === 0)) return false;
                    if (showApproved && !image.approved) return false;
                    if (!showAnnotations && image.annotationCount > 0) return false;
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
                  if (showApproved && !image.approved) return false;
                  if (!showAnnotations && image.annotationCount > 0) return false;
                  return true;
                })
                .map((image: Image, index: number) => renderImage(image, index))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Viewer */}
      <Dialog
        open={selectedImageIndex >= 0}
        onOpenChange={(open) => !open && setSelectedImageIndex(-1)}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          {/* Filename display */}
          {showFilename && selectedImage?.originalFilename && (
            <div className="absolute top-6 left-6 bg-background/80 backdrop-blur-sm rounded px-3 py-1.5 text-sm font-medium z-50">
              {selectedImage.originalFilename}
            </div>
          )}

          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/20 hover:bg-background/40"
            onClick={() => {
              if (!gallery?.images?.length) return;
              setSelectedImageIndex((prev) => (prev <= 0 ? gallery.images.length - 1 : prev - 1));
            }}
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/20 hover:bg-background/40"
            onClick={() => {
              if (!gallery?.images?.length) return;
              setSelectedImageIndex((prev) => (prev >= gallery.images.length - 1 ? 0 : prev + 1));
            }}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>

          {/* Controls */}
          <div className="absolute right-4 top-4 flex items-center gap-2 z-50">
            {selectedImage && (
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 bg-background/95 hover:bg-background shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStarMutation.mutate(selectedImage.id);
                }}
              >
                {selectedImage.starred ? (
                  <Star className="h-8 w-8 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
                ) : (
                  <Star className="h-8 w-8 transition-all duration-300 hover:scale-110" />
                )}
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className={`h-12 w-12 bg-background/95 hover:bg-background shadow-lg ${
                  isAnnotationMode ? "bg-primary/20" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAnnotationMode(!isAnnotationMode);
                  setIsCommentPlacementMode(false);
                  setNewCommentPos(null);
                }}
                title="Toggle Drawing Mode"
              >
                <Paintbrush
                  className={`h-8 w-8 transition-all duration-300 hover:scale-110 ${
                    isAnnotationMode ? "text-primary" : ""
                  }`}
                />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className={`h-12 w-12 bg-background/95 hover:bg-background shadow-lg ${
                  isCommentPlacementMode ? "bg-primary/20" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentPlacementMode(!isCommentPlacementMode);
                  setIsAnnotationMode(false);
                  setNewCommentPos(null);
                }}
                title="Add Comment"
              >
                <MessageCircle
                  className={`h-8 w-8 transition-all duration-300 hover:scale-110 ${
                    isCommentPlacementMode ? "text-primary" : ""
                  }`}
                />
              </Button>
            </div>
          </div>

          {/* Settings toggles */}
          <div className="absolute bottom-6 right-6 flex items-center gap-4 z-50">
            <div className="flex gap-4 bg-background/80 backdrop-blur-sm rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showAnnotations}
                  onCheckedChange={setShowAnnotations}
                  className="data-[state=checked]:bg-primary h-5 w-9"
                />
                <span className="text-xs font-medium">Annotations</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showFilename}
                  onCheckedChange={setShowFilename}
                  className="data-[state=checked]:bg-primary h-5 w-9"
                />
                <span className="text-xs font-medium">Filename</span>
              </div>
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
              <div className="relative">
                {/* Image with onLoad handler */}
                <motion.img
                  src={selectedImage.url}
                  alt=""
                  className="max-h-[calc(90vh-3rem)] max-w-[calc(90vw-3rem)] w-auto h-auto object-contain"
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
                      savedAuthor={userName}
                    />
                  ))}

                {/* New comment */}
                {newCommentPos && selectedImage && (
                  <CommentBubble
                    x={newCommentPos.x}
                    y={newCommentPos.y}
                    isNew
                    savedAuthor={userName}
                    onSubmit={(content, author) => {
                      const newAuthor = author.trim() || userName || "Anonymous";
                      setUserName(newAuthor);
                      if (!selectedImage) return;
                      createCommentMutation.mutate({
                        imageId: selectedImage.id,
                        content,
                        author: newAuthor,
                        x: newCommentPos.x,
                        y: newCommentPos.y,
                      });
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Panel */}
      {renderSettingsPanel()}

      {/* Mobile gallery view */}
      <AnimatePresence>
        {showMobileView && (
          <MobileGalleryView
            images={gallery?.images || []}
            initialIndex={mobileViewIndex}
            onClose={() => setShowMobileView(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Gallery;