import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import mixpanel from "mixpanel-browser";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Trash2, 
  Download, 
  X, 
  MessageSquare,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useTheme } from "@/hooks/use-theme";
import { CommentModal } from "@/components/CommentModal";
import { useQueryClient } from "@tanstack/react-query";

// Types needed for the component
interface Image {
  id: number;
  url: string;
  originalFilename?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  userStarred?: boolean;
  stars?: any[];
  commentCount?: number;
  localUrl?: string;
}

interface Comment {
  id: number;
  content: string;
  xPosition: number;
  yPosition: number;
  createdAt?: string;
  parentId?: number;
  replies?: Comment[];
  reactions?: any[];
  author: {
    id: string;
    username: string;
    imageUrl?: string;
    color?: string;
    firstName?: string;
    lastName?: string;
    fullName: string;
  };
}

interface Annotation {
  id: number;
  pathData: string;
  imageId: number;
  userId: string;
  createdAt: string;
}

// Custom styled DialogContent for the lightbox
const LightboxDialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogContent> & {
  selectedImage: Image | undefined;
  setSelectedImage: (image: Image | null) => void;
  onOpenChange: (open: boolean) => void;
}) => (
  <DialogContent
    className={cn(
      "max-w-[100vw] w-full sm:max-w-[100vw] h-[100vh] p-0 border-0 bg-transparent shadow-none m-0",
      className
    )}
    {...props}
  >
    {children}
  </DialogContent>
);

interface GalleryLightboxProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImage: Image | null;
  setSelectedImage: (image: Image | null) => void;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number) => void;
  images: Image[];
  userRole: string;
  galleryId?: string | number;
  gallerySlug?: string;
  comments: Comment[];
  annotations?: Annotation[];
  toggleStarMutation: {
    mutate: (data: { imageId: number; isStarred: boolean }) => void;
  };
  handleDeleteImage?: (imageId: number) => void;
  handleDownloadImage?: (imageId: number) => void;
  onAddComment?: (imageId: number, content: string, position: { x: number; y: number }) => void;
  onCommentPositionChange?: (commentId: number, x: number, y: number) => void;
  getR2Image: (image: any, quality?: "optimize" | "lightbox") => string;
  preloadAdjacentImages: (index: number) => void;
  user?: any;
  onShowLoginModal?: () => void;
}

export default function GalleryLightbox({
  isOpen,
  onOpenChange,
  selectedImage,
  setSelectedImage,
  selectedImageIndex,
  setSelectedImageIndex,
  images,
  userRole,
  galleryId,
  gallerySlug,
  comments = [],
  annotations = [],
  toggleStarMutation,
  handleDeleteImage,
  handleDownloadImage,
  onAddComment,
  onCommentPositionChange,
  getR2Image,
  preloadAdjacentImages,
  user,
  onShowLoginModal
}: GalleryLightboxProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isLowResLoading, setIsLowResLoading] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [draggingCommentId, setDraggingCommentId] = useState<number | null>(null);
  
  const lightboxImageRef = useRef<HTMLImageElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { isDark } = useTheme();
  
  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Reset loading state when selected image changes
  useEffect(() => {
    setIsLoading(true);
    setIsLowResLoading(true);
  }, [selectedImage?.id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Skip keyboard shortcuts if any input/textarea is focused
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Prevent default actions for arrow keys
      if (["ArrowLeft", "ArrowRight", "Space", "s", "f"].includes(e.key)) {
        e.preventDefault();
      }
      
      if (!images?.length || selectedImageIndex === null) return;
      
      if (e.key === "ArrowLeft") {
        setSelectedImageIndex(
          selectedImageIndex <= 0 ? images.length - 1 : selectedImageIndex - 1
        );
      } else if (e.key === "ArrowRight") {
        setSelectedImageIndex(
          selectedImageIndex >= images.length - 1 ? 0 : selectedImageIndex + 1
        );
      } else if (
        selectedImage &&
        (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "s")
      ) {
        // Track star toggle event
        mixpanel.track("Image Star Toggled", {
          imageId: selectedImage.id,
          galleryId: galleryId,
          gallerySlug: gallerySlug,
          toggledTo: !selectedImage.userStarred,
          action: selectedImage.userStarred ? 'unstar' : 'star',
          userRole: userRole,
          totalStars: selectedImage.stars?.length || 0,
          viewContext: 'lightbox'
        });
        
        // Perform mutation to toggle star
        toggleStarMutation.mutate({
          imageId: selectedImage.id,
          isStarred: selectedImage.userStarred || false,
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen, 
    images, 
    selectedImageIndex, 
    selectedImage, 
    setSelectedImageIndex, 
    toggleStarMutation,
    galleryId,
    gallerySlug,
    userRole
  ]);

  // Function for handling real-time comment position updates
  const handleCommentPositionChange = (commentId: number, x: number, y: number) => {
    if (!selectedImage) return;
    
    // Update client-side cache for immediate visual feedback
    queryClient.setQueryData([`/api/images/${selectedImage.id}/comments`], (oldData: any) => {
      if (!Array.isArray(oldData)) return oldData;
      
      return oldData.map(comment => 
        comment.id === commentId 
          ? { ...comment, xPosition: x, yPosition: y } 
          : comment
      );
    });
    
    // Track which comment is currently being dragged
    setDraggingCommentId(commentId);
    
    // Also call the parent handler to update server state
    if (onCommentPositionChange) {
      onCommentPositionChange(commentId, x, y);
    }
  };

  // Handle drag end (when user releases the comment)
  const handleDragEnd = () => {
    setDraggingCommentId(null);
  };

  // Function to handle image click for comment placement
  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommentPlacementMode || !selectedImage) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Set the new comment position
    setNewCommentPos({ x, y });
    
    // Open the comment dialog to enter text
    setIsCommentModalOpen(true);
    setIsCommentPlacementMode(false);
  };

  const handleCommentSubmit = (content: string) => {
    if (!selectedImage || !newCommentPos || !onAddComment) return;
    
    onAddComment(selectedImage.id, content, newCommentPos);
    setIsCommentModalOpen(false);
    setNewCommentPos(null);
  };

  // Render comment dialog
  const renderCommentDialog = () => {
    if (!isCommentModalOpen || !newCommentPos || !selectedImage) return null;
    
    return (
      <CommentModal
        isOpen={isCommentModalOpen}
        position={newCommentPos}
        onClose={() => {
          setIsCommentModalOpen(false);
          setNewCommentPos(null);
        }}
        onSubmit={handleCommentSubmit}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
        <LightboxDialogContent
          aria-describedby="gallery-lightbox-description"
          selectedImage={selectedImage || undefined}
          setSelectedImage={setSelectedImage}
          onOpenChange={onOpenChange}
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
              if (!images?.length || selectedImageIndex === null) return;
              const newIndex = selectedImageIndex <= 0 ? images.length - 1 : selectedImageIndex - 1;
              preloadAdjacentImages(newIndex);
              setSelectedImageIndex(newIndex);
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
              if (!images?.length || selectedImageIndex === null) return;
              const newIndex = selectedImageIndex >= images.length - 1 ? 0 : selectedImageIndex + 1;
              preloadAdjacentImages(newIndex);
              setSelectedImageIndex(newIndex);
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

                  // Track star toggle event with Mixpanel
                  mixpanel.track("Image Star Toggled", {
                    imageId: selectedImage.id,
                    galleryId: galleryId,
                    gallerySlug: gallerySlug,
                    toggledTo: !selectedImage.userStarred,
                    action: selectedImage.userStarred ? 'unstar' : 'star',
                    userRole: userRole,
                    totalStars: selectedImage.stars?.length || 0,
                    viewContext: 'lightbox'
                  });

                  // Perform mutation to sync with backend
                  toggleStarMutation.mutate({
                    imageId: selectedImage.id,
                    isStarred: selectedImage.userStarred || false,
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
              
              {/* Comment button only for authenticated users */}
              {user ? (
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
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-zinc-800 hover:bg-zinc-200",
                  )}
                  onClick={onShowLoginModal}
                  title="Sign in to comment"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              
              {/* Download button */}
              {handleDownloadImage && selectedImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-zinc-800 hover:bg-zinc-200",
                  )}
                  onClick={() => handleDownloadImage(selectedImage.id)}
                  title="Download Image"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {/* Delete button for editors and owners */}
              {(userRole === "Editor" || userRole === "Owner") && handleDeleteImage && selectedImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    isDark
                      ? "text-white hover:bg-white/10"
                      : "text-zinc-800 hover:bg-zinc-200 hover:text-red-500",
                  )}
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
                      handleDeleteImage(selectedImage.id);
                    }
                  }}
                  title="Delete Image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-zinc-800 hover:bg-zinc-200",
                )}
                onClick={() => onOpenChange(false)}
                title="Close Lightbox"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className={`relative flex items-center justify-center h-full w-full ${
                  isCommentPlacementMode ? "cursor-crosshair" : ""
                }`}
                {...(isMobile && {
                  drag: "x" as const,
                  dragConstraints: { left: 0, right: 0 },
                  dragElastic: 1,
                  onDragEnd: (e: any, info: PanInfo) => {
                    if (selectedImageIndex === null || !images?.length) return;
                    
                    const swipe = Math.abs(info.offset.x) * info.velocity.x;
                    if (
                      swipe < -100 &&
                      selectedImageIndex < images.length - 1
                    ) {
                      setSelectedImageIndex(selectedImageIndex + 1);
                    } else if (swipe > 100 && selectedImageIndex > 0) {
                      setSelectedImageIndex(selectedImageIndex - 1);
                    }
                  },
                })}
              >
                <div
                  className="w-full h-full flex items-center justify-center gallery-container"
                  style={{ 
                    position: "relative",
                    maxHeight: "calc(100vh - 140px)", 
                    maxWidth: "calc(100vw - 140px)"
                  }}
                  onClick={handleImageClick}
                >
                  {isLowResLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
                    </div>
                  )}

                  {/* Final high-res image */}
                  <motion.img
                    src={'localUrl' in selectedImage ? selectedImage.localUrl : getR2Image(selectedImage, "lightbox")}
                    alt={selectedImage.originalFilename || ""}
                    className="max-h-full max-w-full object-contain"
                    ref={lightboxImageRef}
                    style={{ opacity: isLowResLoading ? 0 : 1 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: isLowResLoading ? 0 : 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setIsLowResLoading(false);
                      setIsLoading(false);
                      img.classList.add("loaded");

                      setImageDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }}
                  />

                  {/* Drawing Canvas */}
                  {lightboxImageRef.current && imageDimensions && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        width: lightboxImageRef.current.clientWidth,
                        height: lightboxImageRef.current.clientHeight,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <DrawingCanvas
                        width={imageDimensions.width || 800}
                        height={imageDimensions.height || 600}
                        imageWidth={lightboxImageRef.current.clientWidth}
                        imageHeight={lightboxImageRef.current.clientHeight}
                        isDrawing={isAnnotationMode}
                        savedPaths={showAnnotations ? annotations || [] : []}
                        onSavePath={async (pathData) => {
                          // Implement annotation save logic if needed
                        }}
                      />
                    </div>
                  )}

                  {/* Comments overlay */}
                  {lightboxImageRef.current && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      width: lightboxImageRef.current.clientWidth,
                      height: lightboxImageRef.current.clientHeight,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}>
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
                              replies={comment.replies as any || []}
                              parentId={comment.parentId}
                              timestamp={comment.createdAt || ""}
                              reactions={comment.reactions as any || []}
                              onPositionChange={(x, y) => handleCommentPositionChange(comment.id, x, y)}
                              onDragEnd={handleDragEnd}
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
                            content=""
                            author={{ id: user?.id || "", username: user?.username || "", fullName: user?.fullName || "" }}
                            onSubmit={handleCommentSubmit}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </LightboxDialogContent>
      </DialogPortal>
      {renderCommentDialog()}
    </Dialog>
  );
} 