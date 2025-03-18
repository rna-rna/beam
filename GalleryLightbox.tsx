import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { 
  X, ChevronLeft, ChevronRight, Eye, EyeOff, 
  MessageSquare, MessageSquarePlus, Loader2 
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/use-theme";
import { Button } from "../components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogClose,
  DialogOverlay,
  DialogPortal
} from "../components/ui/dialog";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { CommentBubble } from "../components/CommentBubble";
import { CommentModal } from "../components/CommentModal";
import { LoginModal } from "../components/LoginModal";
import ToggleStarButton from "../components/ToggleStarButton";
import { getR2Image } from "../lib/r2";
import { mixpanel } from "../lib/analytics";
import { useState, useEffect, useCallback, useRef } from "react";
import { throttle } from 'lodash';

interface GalleryLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImage: any | null;
  selectedImageIndex: number;
  galleryImages: any[];
  onNavigate: (newIndex: number) => void;
  gallery?: any;
  comments: any[];
  onCommentPositionChange: (commentId: number, x: number, y: number) => void;
  userRole?: string;
}

const GalleryLightbox = ({
  isOpen,
  onClose,
  selectedImage,
  selectedImageIndex,
  galleryImages,
  onNavigate,
  gallery,
  comments,
  onCommentPositionChange,
  userRole = "Viewer"
}: GalleryLightboxProps) => {
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isLowResLoading, setIsLowResLoading] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [draggingCommentId, setDraggingCommentId] = useState<number | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Initial check of user status
  useEffect(() => {
    console.log("GalleryLightbox user =>", user);
    console.log("GalleryLightbox selectedImage =>", selectedImage);
  }, [user, selectedImage]);

  // Create a throttled version of position update
  const throttledPositionUpdate = useCallback(
    throttle((commentId: number, x: number, y: number) => {
      if (onCommentPositionChange) {
        onCommentPositionChange(commentId, x, y);
      }
    }, 50), // 50ms throttle
    [onCommentPositionChange]
  );

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
    onSuccess: (data) => {
      mixpanel.track("Comment Created", {
        imageId: selectedImage?.id,
        galleryId: gallery?.id,
        gallerySlug: gallery?.slug,
        commentLength: data.content?.length || 0,
        parentCommentId: null,
        userRole: userRole,
        xPosition: newCommentPos?.x,
        yPosition: newCommentPos?.y,
        commentType: "top-level",
        totalComments: (selectedImage?.commentCount || 0) + 1
      });

      if (selectedImage?.id) {
        queryClient.invalidateQueries({
          queryKey: [`/api/images/${selectedImage.id}/comments`],
        });
      }
      setNewCommentPos(null);

      // Don't automatically disable comment placement mode
      // This allows the user to place multiple comments
    },
    onError: (error) => {
      mixpanel.track("Comment Error", {
        imageId: selectedImage?.id,
        galleryId: gallery?.id,
        gallerySlug: gallery?.slug,
        errorMessage: error.message,
        userRole: userRole
      });
    },
  });

  // Monitor comment placement mode changes
  useEffect(() => {
    console.log("isCommentPlacementMode changed to:", isCommentPlacementMode);
    
    // Update cursor style when mode changes
    if (imageContainerRef.current) {
      imageContainerRef.current.style.cursor = isCommentPlacementMode ? 'crosshair' : 'default';
    }
  }, [isCommentPlacementMode]);

  // Preload images for smoother browsing experience
  useEffect(() => {
    if (!selectedImage || !galleryImages?.length) return;

    // Preload 7 images forward and 7 backward
    const preloadRange = 7;
    const preloadImages = () => {
      // Clear previous preloaded images to avoid excessive memory usage
      preloadedImages.current.clear();

      for (let offset = -preloadRange; offset <= preloadRange; offset++) {
        if (offset === 0) continue; // Skip current image

        const indexToPreload = selectedImageIndex + offset;
        if (indexToPreload >= 0 && indexToPreload < galleryImages.length) {
          const imageToPreload = galleryImages[indexToPreload];
          if (!imageToPreload) continue;

          const imageUrl = "localUrl" in imageToPreload 
            ? imageToPreload.localUrl 
            : getR2Image(imageToPreload, "lightbox");

          if (!preloadedImages.current.has(imageUrl)) {
            const img = new Image();
            img.src = imageUrl;
            preloadedImages.current.add(imageUrl);
          }
        }
      }
    };

    preloadImages();
  }, [selectedImageIndex, galleryImages, selectedImage]);

  // Handle clicking on the image to place a comment
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log("handleImageClick fired. isCommentPlacementMode =", isCommentPlacementMode, "selectedImage =", !!selectedImage);
    
    if (!isCommentPlacementMode) {
      console.log("Comment placement mode is OFF, ignoring click");
      return;
    }
    
    if (!selectedImage?.id) {
      console.error("No valid selectedImage with ID, can't place comment");
      return;
    }
    
    if (!imageContainerRef.current) {
      console.error("No imageContainerRef.current, can't calculate position");
      return;
    }

    // Prevent event from bubbling
    e.stopPropagation();

    // Get element's bounding rectangle
    const rect = imageContainerRef.current.getBoundingClientRect();

    // Calculate click position as percentage of image dimensions
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log("Setting comment position:", { x, y });

    // Set the new comment position
    setNewCommentPos({ x, y });

    // Open the comment dialog to enter text
    setIsCommentModalOpen(true);

    // Don't reset comment placement mode here to allow multiple comments to be placed
  };

  // Toggle comment placement mode
  const toggleCommentPlacementMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Comment button clicked. Current user =", !!user);
    
    const newMode = !isCommentPlacementMode;
    console.log("Setting comment placement mode to:", newMode);
    
    setIsCommentPlacementMode(newMode);
    setIsAnnotationMode(false);
    setNewCommentPos(null);
    
    // Update cursor style explicitly
    if (imageContainerRef.current) {
      imageContainerRef.current.style.cursor = newMode ? 'crosshair' : 'default';
      console.log("Updated cursor style to:", newMode ? 'crosshair' : 'default');
    }
  };

  // Handle comment position updates - this works with CommentBubble's onPositionChange prop
  const handleCommentPositionChange = useCallback((commentId: number, x: number, y: number) => {
    if (!selectedImage?.id) return;

    console.log("Comment position changing:", { commentId, x, y });

    // Set which comment is being dragged (for visual feedback)
    setDraggingCommentId(commentId);

    // Update local state immediately for smooth dragging
    queryClient.setQueryData([`/api/images/${selectedImage.id}/comments`], (oldData: any) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map(comment => 
        comment.id === commentId 
          ? { ...comment, xPosition: x, yPosition: y }
          : comment
      );
    });

    // Call throttled handler to avoid too many server updates
    throttledPositionUpdate(commentId, x, y);
  }, [selectedImage?.id, queryClient, throttledPositionUpdate]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    console.log("Drag ended");
    setDraggingCommentId(null);
  }, []);

  // Handle Dialog open/close with proper callback
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  // Close the lightbox when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-7xl w-full h-[95vh] p-0 gap-0 bg-background/95 backdrop-blur-md border-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
          <DialogTitle className="sr-only">Image Viewer</DialogTitle>

          {/* Close button */}
          <DialogClose className="absolute right-4 top-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9",
                isDark
                  ? "text-white hover:bg-white/10"
                  : "text-gray-800 hover:bg-gray-200"
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>

          {/* Navigation */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-9 w-9",
              isDark
                ? "text-white hover:bg-white/10"
                : "text-gray-800 hover:bg-gray-200"
            )}
            onClick={() => {
              if (!galleryImages?.length) return;
              const newIndex =
                selectedImageIndex <= 0
                  ? galleryImages.length - 1
                  : selectedImageIndex - 1;
              onNavigate(newIndex);
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
                : "text-gray-800 hover:bg-gray-200"
            )}
            onClick={() => {
              if (!galleryImages?.length) return;
              const newIndex =
                selectedImageIndex >= galleryImages.length - 1
                  ? 0
                  : selectedImageIndex + 1;
              onNavigate(newIndex);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Controls */}
          <div className="absolute right-16 top-4 flex items-center gap-2 z-50">
            {selectedImage && (
              <ToggleStarButton
                image={selectedImage}
                gallery={gallery}
                userRole={userRole}
              />
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-gray-800 hover:bg-gray-200"
                )}
                onClick={() => setShowAnnotations(!showAnnotations)}
                title={showAnnotations ? "Hide Comments" : "Show Comments"}
              >
                {showAnnotations ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              
              {/* Important: Removed SignedIn/SignedOut components that were blocking functionality */}
              {/* Comment button that works regardless of user status */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-zinc-800 hover:bg-zinc-200",
                  isCommentPlacementMode && "bg-primary/20"
                )}
                onClick={toggleCommentPlacementMode}
                title="Add Comment"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              
              {/* Login button shows up regardless, but is handled differently */}
              {!user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-zinc-800 hover:bg-zinc-200"
                  )}
                  onClick={() => setShowLoginModal(true)}
                  title="Sign in to comment"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              
              <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
              />
            </div>
          </div>

          {selectedImage && (
            <div
              ref={imageContainerRef}
              className={cn(
                "relative w-full h-full flex items-center justify-center gallery-container lightbox-img-container z-10",
                isCommentPlacementMode && "cursor-crosshair ring-2 ring-primary ring-opacity-50 transition-all duration-200"
              )}
              onClick={handleImageClick}
              style={{
                cursor: isCommentPlacementMode ? 'crosshair' : 'default',
                position: 'relative',
                pointerEvents: 'auto'
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

                {/* Main image */}
                <motion.img
                  src={
                    "localUrl" in selectedImage
                      ? selectedImage.localUrl
                      : getR2Image(selectedImage, "lightbox")
                  }
                  alt={selectedImage.originalFilename || ""}
                  className="lightbox-img"
                  onError={(e) => {
                    if (!("localUrl" in selectedImage)) {
                      e.currentTarget.src = "/fallback-image.jpg";
                    }
                  }}
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
                    e.currentTarget.classList.add("loaded");

                    setImageDimensions({
                      width: e.currentTarget.clientWidth,
                      height: e.currentTarget.clientHeight,
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
                    savedPaths={[]}
                    onSavePath={async () => {}}
                  />
                </div>

                {/* Comments */}
                {showAnnotations &&
                  selectedImage?.id &&
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="absolute pointer-events-auto"
                      style={{
                        top: `${comment.yPosition}%`,
                        left: `${comment.xPosition}%`,
                        zIndex: draggingCommentId === comment.id ? 50 : 20,
                      }}
                    >
                      <CommentBubble
                        id={comment.id}
                        x={comment.xPosition}
                        y={comment.yPosition}
                        content={comment.content}
                        author={comment.author}
                        imageId={Number(selectedImage.id)}
                        replies={comment.replies || []}
                        parentId={comment.parentId}
                        timestamp={comment.createdAt}
                        reactions={comment.reactions || []}
                        onPositionChange={(x, y) => handleCommentPositionChange(comment.id, x, y)}
                      />
                    </div>
                  ))}

                {/* New comment placement */}
                {newCommentPos && selectedImage && (
                  <div
                    className="absolute pointer-events-auto"
                    style={{
                      top: `${newCommentPos.y}%`,
                      left: `${newCommentPos.x}%`,
                      zIndex: 30,
                    }}
                  >
                    <CommentBubble
                      x={newCommentPos.x}
                      y={newCommentPos.y}
                      isNew={true}
                      isExpanded={true}
                      imageId={selectedImage?.id}
                      replies={[]}
                      onSubmit={() => {
                        setNewCommentPos(null);
                        queryClient.invalidateQueries({
                          queryKey: ["/api/galleries"],
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        position={newCommentPos}
        onClose={() => {
          setIsCommentModalOpen(false);
          setNewCommentPos(null);
        }}
        onSubmit={(content) => {
          if (!user) {
            console.log("User not authenticated, cannot submit comment");
            setShowLoginModal(true);
            return;
          }

          if (!selectedImage?.id || !newCommentPos) {
            console.error("Missing required data for comment:", { 
              imageId: selectedImage?.id, 
              commentPos: newCommentPos 
            });
            return;
          }

          console.log("Creating comment with content:", content);

          createCommentMutation.mutate({
            imageId: selectedImage.id,
            content,
            x: newCommentPos.x,
            y: newCommentPos.y,
          });

          setIsCommentModalOpen(false);
        }}
      />
    </Dialog>
  );
};

export default GalleryLightbox;