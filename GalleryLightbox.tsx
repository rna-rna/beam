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
  DialogClose 
} from "../components/ui/dialog";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { CommentBubble } from "../components/CommentBubble";
import { CommentModal } from "../components/CommentModal";
import { LoginModal } from "../components/LoginModal";
import ToggleStarButton from "../components/ToggleStarButton";
import { getR2Image } from "../lib/r2";
import { mixpanel } from "../lib/analytics";
import { useState, useEffect, useCallback, useRef, forwardRef } from "react";

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

const GalleryLightbox = forwardRef<HTMLDivElement, GalleryLightboxProps>(({
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
}, ref) => {
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
    if (!isCommentPlacementMode || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewCommentPos({ x, y });
    setIsCommentModalOpen(true);
    // We don't disable comment placement mode here, allowing multiple comments to be placed
    // This maintains the crosshair cursor until the user explicitly toggles it off
  };

  // Handle comment position updates - this works with CommentBubble's onPositionChange prop
  const handleCommentPositionChange = useCallback((commentId: number, x: number, y: number) => {
    if (!selectedImage?.id) return;

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

    // Call parent handler to update server state
    onCommentPositionChange(commentId, x, y);
  }, [selectedImage?.id, queryClient, onCommentPositionChange]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingCommentId(null);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-7xl w-full h-[95vh] p-0 gap-0 bg-background/95 backdrop-blur-md border-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div ref={ref} className="relative w-full h-full overflow-hidden flex items-center justify-center">
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
              <SignedIn>
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
                  onClick={() => {
                    // Toggle comment placement mode
                    const newMode = !isCommentPlacementMode;
                    setIsCommentPlacementMode(newMode);
                    setIsAnnotationMode(false);
                    setNewCommentPos(null);

                    // Update cursor style
                    const container = imageContainerRef.current;
                    if (container) {
                      container.style.cursor = newMode ? 'crosshair' : 'default';
                    }
                  }}
                  title="Add Comment"
                >
                  <MessageSquarePlus className="h-4 w-4" />
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
                      : "text-zinc-800 hover:bg-zinc-200"
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
            <div
              ref={imageContainerRef}
              className={cn(
                "relative w-full h-full flex items-center justify-center gallery-container",
                isCommentPlacementMode && "cursor-crosshair"
              )}
              onClick={handleImageClick}
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
                        key={comment.id}
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
          // Don't reset newCommentPos here to avoid the comment disappearing before server response
        }}
      />
    </Dialog>
  );
});

export default GalleryLightbox;