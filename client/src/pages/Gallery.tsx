import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "wouter";
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

import { CommentBubble } from "@/components/CommentBubble";
import { useDropzone } from 'react-dropzone';
import type { Image, Gallery as GalleryType, Comment } from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import { CommentModal } from "@/components/CommentModal";
import { useUser } from '@clerk/clerk-react';
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadProgress {
  [key: string]: number;
}

interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
  selectMode: boolean;
  setSelectMode: (mode: boolean) => void;
}

export default function Gallery({
  slug: propSlug,
  title,
  onHeaderActionsChange,
  selectMode,
  setSelectMode
}: GalleryProps) {
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
  const [showFilename, setShowFilename] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isMasonry, setIsMasonry] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [showWithComments, setShowWithComments] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  // Queries
  const { data: gallery, isLoading } = useQuery<GalleryType>({
    queryKey: [`/api/galleries/${slug}`],
    enabled: !!slug,
  });

  const selectedImage = gallery?.images?.[selectedImageIndex] ?? null;

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });

  // Mutations
  const toggleStarMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const token = await getToken();
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to toggle star');
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

  // Define onDrop before useDropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (selectedImageIndex >= 0 || selectMode) return;

    setIsUploading(true);
    const token = await getToken();
    const formData = new FormData();

    const progressMap: UploadProgress = {};
    acceptedFiles.forEach((file) => {
      formData.append("images", file);
      progressMap[file.name] = 0;
    });
    setUploadProgress(progressMap);

    try {
      const res = await fetch(`/api/galleries/${slug}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to upload images');
      }

      await queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [selectedImageIndex, selectMode, slug, getToken, queryClient, toast]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading || selectMode,
    noClick: true,
    noKeyboard: true
  });

  const renderUploadPlaceholders = () => {
    if (!Object.keys(uploadProgress).length) return null;

    return Object.entries(uploadProgress).map(([filename, progress]) => (
      <motion.div
        key={filename}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-card rounded-lg overflow-hidden relative"
      >
        <div className="w-full aspect-[4/3] flex items-center justify-center">
          <span className="text-muted-foreground">{filename}</span>
        </div>
        <div className="absolute inset-0 flex flex-col justify-end">
          <Progress value={progress} className="h-1" />
        </div>
      </motion.div>
    ));
  };

  // Handlers
  const handleImageClick = (index: number) => {
    if (selectMode) return;
    setSelectedImageIndex(index);
  };

  const handleImageComment = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommentPlacementMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setNewCommentPos({ x, y });
    setIsCommentModalOpen(true);
  };

  // Layout calculations
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

  const renderImage = (image: Image, index: number) => (
    <motion.div
      key={image.id}
      layout="position"
      className={cn(
        "mb-4 image-container relative",
        !isMasonry && "aspect-[4/3]",
        isReorderMode && "cursor-grab active:cursor-grabbing"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: preloadedImages.has(image.id) ? 1 : 0, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => handleImageClick(index)}
    >
      <div className={cn(
        "relative bg-card rounded-lg overflow-hidden transform transition-all duration-200",
        !isReorderMode && "hover:scale-[1.02]",
        !selectMode && "cursor-pointer",
        isReorderMode && "border-2 border-dashed border-gray-200 border-opacity-50"
      )}>
        {preloadedImages.has(image.id) && (
          <img
            src={image.url}
            alt=""
            className={cn(
              "w-full h-auto object-cover rounded-lg",
              selectMode && selectedImages.includes(image.id) && "opacity-75"
            )}
            loading="lazy"
            draggable={false}
          />
        )}

        {/* Star Button */}
        {!selectMode && (
          <motion.div
            className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 md:group-hover:opacity-100 md:opacity-0 max-md:opacity-100"
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.8 }}
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

        {/* Comment Count Badge */}
        {!selectMode && image.commentCount! > 0 && (
          <Badge
            className="absolute top-2 right-2 bg-primary text-primary-foreground flex items-center gap-1"
            variant="secondary"
          >
            <MessageSquare className="w-3 h-3" />
            {image.commentCount}
          </Badge>
        )}

        {/* Selection Checkbox */}
        {selectMode && !isReorderMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 z-10"
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                selectedImages.includes(image.id)
                  ? "bg-primary border-primary"
                  : "bg-background/80 border-background/80"
              )}
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

  return (
    <>
      <div className="relative min-h-screen bg-background" {...getRootProps()}>
        <input {...getInputProps()} />

        {isDragActive && !selectMode && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Drop images to upload</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Supported formats: JPG, PNG, GIF, WEBP
              </p>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="p-6">
          <Masonry
            breakpointCols={breakpointCols}
            className="flex -ml-4 w-auto"
            columnClassName="pl-4"
          >
            {renderUploadPlaceholders()}
            {gallery?.images
              ?.filter(image => {
                if (showStarredOnly) return image.starred;
                if (showWithComments) return image.commentCount! > 0;
                return true;
              })
              .map((image, index) => renderImage(image, index))}
          </Masonry>
        </div>

        {/* Image Lightbox */}
        <Dialog open={selectedImageIndex !== -1} onOpenChange={() => setSelectedImageIndex(-1)}>
          <DialogContent className="max-w-[95vw] h-[95vh] p-0 bg-background/95 backdrop-blur-sm overflow-hidden">
            {selectedImage && gallery?.images && (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Previous Image Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 hover:bg-background/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev =>
                      prev <= 0 ? gallery.images.length - 1 : prev - 1
                    );
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                {/* Next Image Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 hover:bg-background/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev =>
                      prev >= gallery.images.length - 1 ? 0 : prev + 1
                    );
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Image Container */}
                <div
                  className="relative w-full h-full flex items-center justify-center overflow-hidden"
                  onClick={handleImageComment}
                >
                  <motion.img
                    key={selectedImage.id}
                    src={selectedImage.url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    draggable={false}
                  />

                  {/* Comment Bubbles */}
                  {comments.map((comment) => (
                    <CommentBubble
                      key={comment.id}
                      comment={comment}
                      x={comment.xPosition}
                      y={comment.yPosition}
                    />
                  ))}
                </div>

                {/* Image Tools */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Star Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-background/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarMutation.mutate(selectedImage.id);
                        }}
                      >
                        <Star className={cn(
                          "h-5 w-5",
                          selectedImage.starred && "fill-yellow-400 text-yellow-400"
                        )} />
                      </Button>

                      {/* Comment Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "hover:bg-background/20",
                          isCommentPlacementMode && "bg-accent text-accent-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCommentPlacementMode(!isCommentPlacementMode);
                        }}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>

                      {/* Comment Count */}
                      {selectedImage.commentCount! > 0 && (
                        <Badge variant="secondary" className="bg-background/80">
                          {selectedImage.commentCount} comments
                        </Badge>
                      )}
                    </div>

                    {/* Download Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-background/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(selectedImage.url, '_blank');
                      }}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Masonry Resize Slider */}
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Grid Size</span>
          <Slider
            value={[scale]}
            onValueChange={([value]) => setScale(value)}
            min={50}
            max={150}
            step={10}
            className="w-32"
          />
        </div>
      </div>
    </>
  );
}