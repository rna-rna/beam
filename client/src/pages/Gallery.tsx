import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

// UI Components
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

// Custom Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";

// Icons
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Paintbrush,
  Settings,
  Share2,
  Star,
} from "lucide-react";

interface Image {
  id: number;
  url: string;
  starred?: boolean;
  commentCount: number;
  position?: number;
}

interface Gallery {
  id: number;
  slug: string;
  title: string;
  images: Image[];
}

interface GalleryProps {
  slug?: string;
  title: string;
  onTitleChange: (title: string) => void;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

interface Comment {
  id: number;
  content: string;
  xPosition: number;
  yPosition: number;
  author?: string;
}

interface Annotation {
  id: number;
  pathData: string;
}

function Gallery({ slug: propSlug, title, onTitleChange, onHeaderActionsChange }: GalleryProps) {
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
  const [isZoomed, setIsZoomed] = useState(false);

  // Refs for zoom and pan
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });

  // Queries
  const { data: gallery, isLoading, error } = useQuery<Gallery>({
    queryKey: [`/api/galleries/${slug}`],
    enabled: !!slug,
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

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        const res = await fetch(`/api/galleries/${slug}/images`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload images");
        return res.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      setIsReorderMode(false);
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
      if (selectedImageIndex >= 0) return;
      uploadMutation.mutate(acceptedFiles);
    },
    [uploadMutation, selectedImageIndex]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    noClick: true,
  });

  // Memoized Values
  const breakpointCols = useMemo(
    () => ({
      default: Math.max(1, Math.floor(6 * (100 / scale))),
      2560: Math.max(1, Math.floor(5 * (100 / scale))),
      1920: Math.max(1, Math.floor(4 * (100 / scale))),
      1536: Math.max(1, Math.floor(3 * (100 / scale))),
      1024: Math.max(1, Math.floor(2 * (100 / scale))),
      640: 1,
    }),
    [scale]
  );

  const renderGalleryControls = useCallback(() => {
    if (!gallery) return null;

    const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Gallery link copied to clipboard",
      });
    };

    const handleReorderToggle = () => {
      if (isReorderMode && reorderImageMutation.isPending) return;
      setIsReorderMode(!isReorderMode);
    };

    const handleStarredToggle = () => {
      setShowStarredOnly(!showStarredOnly);
    };

    return (
      <div className="flex items-center gap-2">
        {isUploading && (
          <div className="flex items-center gap-4">
            <Progress value={undefined} className="w-24" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={handleReorderToggle}
          disabled={reorderImageMutation.isPending}
          className={isReorderMode ? "bg-primary/10" : ""}
        >
          {isReorderMode && reorderImageMutation.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <ArrowUpDown className={`h-4 w-4 ${isReorderMode ? "text-primary" : ""}`} />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleStarredToggle}
          className={showStarredOnly ? "bg-primary/10" : ""}
        >
          <Star className={`h-4 w-4 ${showStarredOnly ? "fill-primary text-primary" : ""}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyLink}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>More Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              Coming soon...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }, [
    gallery,
    isUploading,
    isReorderMode,
    reorderImageMutation.isPending,
    showStarredOnly,
    setIsReorderMode,
    setShowStarredOnly,
    toast,
  ]);

  // Effects
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Masonry
          breakpointCols={breakpointCols}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-background"
        >
          {[...Array(8)].map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="w-full h-48 md:h-64 lg:h-80" />
            </div>
          ))}
        </Masonry>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Failed to load gallery</h1>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Gallery not found</h1>
      </div>
    );
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, [isZoomed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !isZoomed) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    translateRef.current = {
      x: translateRef.current.x + dx,
      y: translateRef.current.y + dy,
    };

    if (imageContainerRef.current) {
      imageContainerRef.current.style.transform = `translate(${translateRef.current.x}px, ${translateRef.current.y}px)`;
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, [isZoomed]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleZoomClick = useCallback((e: React.MouseEvent) => {
    if (isAnnotationMode || isCommentPlacementMode) return;

    setIsZoomed(prev => {
      if (!prev) {
        // Reset transform when zooming in
        translateRef.current = { x: 0, y: 0 };
        if (imageContainerRef.current) {
          imageContainerRef.current.style.transform = 'translate(0, 0)';
        }
      }
      return !prev;
    });
  }, [isAnnotationMode, isCommentPlacementMode]);

  return (
    <div {...getRootProps()} className="min-h-screen relative">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-lg font-medium text-primary">Drop images to add to gallery</div>
        </div>
      )}

      <div className="px-6 md:px-8 lg:px-12 py-8">
        <div
          style={{
            width: "100%",
            maxWidth: scale < 100 ? "100%" : `${scale}%`,
            margin: "0 auto",
            transition: "max-width 0.2s ease-out",
          }}
        >
          {isReorderMode ? (
            <DragDropContext
              onDragEnd={(result) => {
                const { destination, source } = result;
                if (!destination) return;
                if (destination.index === source.index) return;

                const visibleImages = gallery.images.filter((img) => !showStarredOnly || img.starred);
                const reorderedImages = Array.from(visibleImages);
                const [removed] = reorderedImages.splice(source.index, 1);
                reorderedImages.splice(destination.index, 0, removed);

                const newOrder = reorderedImages.map((img) => img.id);
                reorderImageMutation.mutate(newOrder);
              }}
            >
              <Droppable droppableId="gallery">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  >
                    {gallery.images
                      .filter((image) => !showStarredOnly || image.starred)
                      .map((image, index) => (
                        <Draggable
                          key={`image-${image.id}`}
                          draggableId={`image-${image.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-move transition-transform duration-200 ${
                                snapshot.isDragging ? "scale-105 shadow-xl z-50" : ""
                              }`}
                            >
                              <div className="relative bg-card rounded-lg overflow-hidden border border-border/50">
                                <img
                                  src={image.url}
                                  alt=""
                                  className="w-full h-auto object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                  {image.commentCount > 0 && (
                                    <Badge
                                      className="bg-primary text-primary-foreground flex items-center gap-1"
                                      variant="secondary"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      {image.commentCount}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStarMutation.mutate(image.id);
                                    }}
                                  >
                                    {image.starred ? (
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
                                    ) : (
                                      <Star className="h-4 w-4 transition-all duration-300 hover:scale-110" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <Masonry
              breakpointCols={breakpointCols}
              className="flex -ml-4 w-[calc(100%+1rem)]"
              columnClassName="pl-4 bg-background"
            >
              {gallery.images
                .filter((image) => !showStarredOnly || image.starred)
                .map((image, index) => (
                  <div
                    key={image.id}
                    className="mb-4 cursor-pointer transition-transform hover:scale-[1.02]"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <div className="relative">
                      <img
                        src={image.url}
                        alt=""
                        className="w-full h-auto object-contain rounded-md"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        {image.commentCount > 0 && (
                          <Badge
                            className="bg-primary text-primary-foreground flex items-center gap-1"
                            variant="secondary"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {image.commentCount}
                          </Badge>
                        )}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarMutation.mutate(image.id);
                          }}
                        >
                          {image.starred ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
                          ) : (
                            <Star className="h-4 w-4 transition-all duration-300 hover:scale-110" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </Masonry>
          )}
        </div>
      </div>

      {/* Scale Slider */}
      <div className="fixed bottom-6 right-6 z-50 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <Slider
          value={[scale]}
          onValueChange={([value]) => setScale(value)}
          min={50}
          max={150}
          step={10}
          className="w-[100px]"
        />
      </div>

      <Dialog
        open={selectedImageIndex >= 0}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImageIndex(-1);
            setNewCommentPos(null);
            setIsZoomed(false);
            translateRef.current = { x: 0, y: 0 };
          }
        }}
      >
        <DialogContent
          className="max-w-[90vw] h-[90vh] p-6 bg-background/95 backdrop-blur border-none overflow-hidden"
          aria-describedby="gallery-lightbox-description"
        >
          <div id="gallery-lightbox-description" className="sr-only">
            Image viewer with annotation and commenting capabilities
          </div>

          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/20 hover:bg-background/40"
            onClick={() => {
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
              setSelectedImageIndex((prev) => (prev >= gallery.images.length - 1 ? 0 : prev + 1));
            }}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>

          {/* Controls */}
          <div className="absolute right-4 top-4 flex items-center gap-2 z-50 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 bg-background/95 hover:bg-background shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarMutation.mutate(selectedImage!.id);
              }}
            >
              {selectedImage?.starred ? (
                <Star className="h-8 w-8 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
              ) : (
                <Star className="h-8 w-8 transition-all duration-300 hover:scale-110" />
              )}
            </Button>
            <div className="flex items-center gap-2">
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
              <div className="ml-4">
                <Switch
                  checked={showAnnotations}
                  onCheckedChange={setShowAnnotations}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>

          {selectedImage && (
            <div
              className={`relative w-full h-full flex items-center justify-center ${
                isCommentPlacementMode ? "cursor-crosshair" : ""
              }`}
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
                ref={imageContainerRef}
                className="relative transition-transform duration-300 ease-out"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  cursor: isCommentPlacementMode
                    ? "crosshair"
                    : isAnnotationMode
                    ? "crosshair"
                    : isZoomed
                    ? "grab"
                    : "zoom-in",
                }}
              >
                <img
                  src={selectedImage.url}
                  alt=""
                  className={`max-h-[calc(90vh-3rem)] max-w-[calc(90vw-3rem)] w-auto h-auto object-contain transition-transform duration-300 ${
                    isZoomed ? "scale-150" : ""
                  }`}
                  onClick={handleZoomClick}
                  draggable={false}
                />

                {/* Drawing Canvas */}
                <div className={`absolute inset-0 ${isZoomed ? "hidden" : ""}`}>
                  <DrawingCanvas
                    width={800}
                    height={600}
                    isDrawing={isAnnotationMode}
                    savedPaths={showAnnotations ? annotations : []}
                    onSavePath={async (pathData) => {
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
                {!isZoomed && showAnnotations &&
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
                {!isZoomed && newCommentPos && (
                  <CommentBubble
                    x={newCommentPos.x}
                    y={newCommentPos.y}
                    isNew
                    savedAuthor={userName}
                    onSubmit={(content, author) => {
                      const newAuthor = author.trim() || userName || "Anonymous";
                      setUserName(newAuthor);
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Gallery;