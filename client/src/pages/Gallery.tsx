import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Masonry from "react-masonry-css";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useParams } from "wouter";
import { X, MessageCircle, Star, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Star as StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CommentBubble } from "@/components/CommentBubble";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { InlineEdit } from "@/components/InlineEdit";

interface Comment {
  id: number;
  content: string;
  xPosition: number;
  yPosition: number;
}

export default function Gallery() {
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [galleryTitle, setGalleryTitle] = useState<string>("Untitled Project");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(100); // Scale percentage
  const [isUploading, setIsUploading] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  const { data: gallery, isLoading } = useQuery<{ 
    id: number;
    slug: string;
    title: string;
    images: any[];
  }>({
    queryKey: [`/api/galleries/${slug}`],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('images', file);
        });

        const res = await fetch(`/api/galleries/${slug}/images`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Failed to upload images');
        }

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
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (selectedImageIndex >= 0) return; // Don't upload if lightbox is open
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation, selectedImageIndex]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    noClick: true // Only accept drag and drop
  });

  const selectedImage = gallery?.images[selectedImageIndex] ?? null;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!gallery?.images.length) return;
    
    if (e.key === 'ArrowLeft') {
      setSelectedImageIndex(prev => 
        prev <= 0 ? gallery.images.length - 1 : prev - 1
      );
    } else if (e.key === 'ArrowRight') {
      setSelectedImageIndex(prev => 
        prev >= gallery.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  useEffect(() => {
    if (selectedImageIndex >= 0) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedImageIndex, gallery?.images.length]);

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/images/${selectedImage?.id}/comments`],
    enabled: !!selectedImage?.id,
  });

  const toggleStarMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await fetch(`/api/images/${imageId}/star`, { // Changed endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

  const createCommentMutation = useMutation({
    mutationFn: async ({ imageId, content, x, y }: { imageId: number; content: string; x: number; y: number }) => {
      const res = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, xPosition: x, yPosition: y }),
      });
      if (!res.ok) throw new Error('Failed to create comment');
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

  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/galleries/${slug}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update gallery title');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Success",
        description: "Gallery title updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update gallery title",
        variant: "destructive",
      });
    },
  });

  const reorderImageMutation = useMutation({
    mutationFn: async (newOrder: Array<string | number>) => {
      // Ensure all IDs are numbers
      const normalizedOrder = newOrder.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      
      const res = await fetch(`/api/galleries/${slug}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: normalizedOrder }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to reorder images: ${error}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Order Saved",
        description: "Image order saved successfully.",
      });
      setIsReorderMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save image order: ${error.message}`,
        variant: "destructive",
      });
    },
  });


  // Adjust breakpoints based on scale to maintain proper layout
  const breakpointCols = {
    default: scale > 120 ? 3 : 4,
    1536: scale > 120 ? 2 : 3,
    1024: 2,
    640: 1
  };

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

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">
          Gallery not found
        </h1>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="min-h-screen">
      <input {...getInputProps()} />
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4 flex items-center gap-4">
          <InlineEdit
            value={gallery?.title || "Untitled Project"}
            onSave={(newTitle) => updateTitleMutation.mutate(newTitle)}
            className="text-xl font-semibold"
          />
          {isUploading && (
            <div className="flex-1 flex items-center gap-4">
              <Progress value={undefined} className="flex-1" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </div>
          )}
          
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Gallery Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="flex-col items-start">
                    <div className="mb-2 text-sm">Scale: {scale}%</div>
                    <Slider
                      value={[scale]}
                      onValueChange={([value]) => setScale(value)}
                      min={50}
                      max={150}
                      step={10}
                      className="w-full"
                    />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (isReorderMode && reorderImageMutation.isPending) return;
                      setIsReorderMode(!isReorderMode);
                    }}
                    disabled={reorderImageMutation.isPending}
                  >
                    {isReorderMode 
                      ? reorderImageMutation.isPending 
                        ? "Saving..." 
                        : "Save Order" 
                      : "Reorder Images"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowStarredOnly(!showStarredOnly)}>
                    {showStarredOnly ? "Show All Images" : "Show Starred Images Only"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {isDragActive && (
        <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-lg font-medium text-primary">
            Drop images to add to gallery
          </div>
        </div>
      )}

      <div className="px-6 md:px-8 lg:px-12 py-8">
        <div style={{ maxWidth: `${scale}%`, margin: '0 auto', width: '100%' }}>
          {isReorderMode ? (
            <DragDropContext
              onDragEnd={({ destination, source }) => {
                if (!destination || destination.index === source.index) return;
                
                if (!gallery?.images) {
                  console.error('No images available for reordering');
                  return;
                }
                
                try {
                  console.log('Drag ended:', { source, destination });
                  
                  const newImages = Array.from(gallery.images);
                  const [removed] = newImages.splice(source.index, 1);
                  newImages.splice(destination.index, 0, removed);
                  
                  // Validate image IDs before proceeding
                  const newOrder = newImages.map(img => {
                    if (!img?.id) {
                      throw new Error('Invalid image data found while reordering');
                    }
                    return img.id;
                  });
                  
                  console.log('Updating order:', newOrder);
                  
                  // Optimistically update the UI
                  queryClient.setQueryData([`/api/galleries/${slug}`], {
                    ...gallery,
                    images: newImages
                  });
                  
                  // Update the backend
                  reorderImageMutation.mutate(newOrder);
                } catch (error) {
                  console.error('Error during drag operation:', error);
                  queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
                  toast({
                    title: "Error",
                    description: "Failed to reorder images. Please try again.",
                    variant: "destructive"
                  });
                }
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
                .filter(image => !showStarredOnly || image.starred)
                .map((image: any, index: number) => {
                      // Use consistent ID format for draggable elements
                      return (
                        <Draggable key={image.id} draggableId={String(image.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-move transition-transform duration-200 ${
                                snapshot.isDragging ? 'scale-105 shadow-xl z-50' : ''
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
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStarMutation.mutate(image.id);
                                    }}
                                  >
                                    {image.starred ? (
                                      <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    ) : (
                                      <Star className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <Masonry
              breakpointCols={breakpointCols}
              className="flex -ml-6 w-auto"
              columnClassName="pl-6 bg-background"
            >
              {gallery.images
                .filter((image: any) => !showStarredOnly || image.starred) // Apply filter
                .map((image: any, index: number) => (
                <div 
                  key={image.id} 
                  className="mb-4 cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => setSelectedImageIndex(index)}
                  style={{
                    width: '100%',
                    transition: 'transform 0.2s'
                  }}
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
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarMutation.mutate(image.id);
                        }}
                      >
                        {image.starred ? (
                          <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="h-4 w-4" />
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

      <Dialog open={selectedImageIndex >= 0} onOpenChange={(open) => {
        if (!open) {
          setSelectedImageIndex(-1);
          setNewCommentPos(null);
        }
      }}>
        <DialogContent className="max-w-[90vw] h-[90vh] p-6 bg-background/95 backdrop-blur border-none overflow-hidden">
          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/20 hover:bg-background/40"
            onClick={(e) => {
              e.stopPropagation();
              handleKeyDown({ key: 'ArrowLeft' } as KeyboardEvent);
            }}
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/20 hover:bg-background/40"
            onClick={(e) => {
              e.stopPropagation();
              handleKeyDown({ key: 'ArrowRight' } as KeyboardEvent);
            }}
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </Button>
          <div className="absolute right-4 top-4 flex items-center gap-2 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-background/20 hover:bg-background/40"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarMutation.mutate(selectedImage!.id);
              }}
            >
              {selectedImage?.starred ? (
                <StarIcon className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ) : (
                <Star className="h-6 w-6 text-white" />
              )}
            </Button>
            <button
              onClick={() => setSelectedImageIndex(-1)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-6 w-6 text-white" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          {selectedImage && (
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => {
                if (e.target === e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setNewCommentPos({ x, y });
              }}
            >
              <img
                src={selectedImage.url}
                alt=""
                className="max-h-[calc(90vh-3rem)] max-w-[calc(90vw-3rem)] w-auto h-auto object-contain"
              />
              
              {/* Existing comments */}
              {comments.map((comment) => (
                <CommentBubble
                  key={comment.id}
                  x={comment.xPosition}
                  y={comment.yPosition}
                  content={comment.content}
                />
              ))}
              
              {/* New comment */}
              {newCommentPos && (
                <CommentBubble
                  x={newCommentPos.x}
                  y={newCommentPos.y}
                  isNew
                  onSubmit={(content) => {
                    createCommentMutation.mutate({
                      imageId: selectedImage.id,
                      content,
                      x: newCommentPos.x,
                      y: newCommentPos.y,
                    });
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}