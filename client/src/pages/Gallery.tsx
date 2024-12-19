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
import { X, MessageCircle, Star, ChevronLeft, ChevronRight, Settings, ArrowUpDown, Share2, Paintbrush } from "lucide-react";
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
import { DrawingCanvas } from "@/components/DrawingCanvas";

interface Comment {
  id: number;
  content: string;
  xPosition: number;
  yPosition: number;
  author?: string;
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
  const [userName, setUserName] = useState<string>("");
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
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

  // Fetch annotations when an image is selected
  const { data: annotations = [] } = useQuery<Array<{ id: number; pathData: string }>>({
    queryKey: [`/api/images/${selectedImage?.id}/annotations`],
    enabled: !!selectedImage?.id,
  });
  
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
    mutationFn: async ({ imageId, content, author, x, y }: { imageId: number; content: string; author: string; x: number; y: number }) => {
      const res = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author, xPosition: x, yPosition: y }),
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
    mutationFn: async (newOrder: number[]) => {
      const res = await fetch(`/api/galleries/${slug}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
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


  // Calculate breakpoints based on scale
  const breakpointCols = {
    default: Math.max(1, Math.floor(6 * (100 / scale))), // More columns when zoomed out
    2560: Math.max(1, Math.floor(5 * (100 / scale))),
    1920: Math.max(1, Math.floor(4 * (100 / scale))),
    1536: Math.max(1, Math.floor(3 * (100 / scale))),
    1024: Math.max(1, Math.floor(2 * (100 / scale))),
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
          
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (isReorderMode && reorderImageMutation.isPending) return;
                setIsReorderMode(!isReorderMode);
              }}
              disabled={reorderImageMutation.isPending}
              className={isReorderMode ? 'bg-primary/10' : ''}
            >
              {isReorderMode && reorderImageMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ArrowUpDown className={`h-4 w-4 ${isReorderMode ? 'text-primary' : ''}`} />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={showStarredOnly ? 'bg-primary/10' : ''}
            >
              <Star className={`h-4 w-4 ${showStarredOnly ? 'fill-primary text-primary' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({
                  title: "Link Copied",
                  description: "Gallery link copied to clipboard",
                });
              }}
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
        <div style={{ 
          width: '100%',
          maxWidth: scale < 100 ? '100%' : `${scale}%`,
          margin: '0 auto',
          transition: 'max-width 0.2s ease-out'
        }}>
          {isReorderMode ? (
            <DragDropContext
              onDragEnd={(result) => {
                const { destination, source } = result;
                console.log('Starting drag operation:', {
                  draggableId: result.draggableId,
                  source: result.source,
                  destination: result.destination
                });
                
                if (!destination) {
                  console.log('No valid destination found, skipping reorder');
                  return;
                }
                
                if (destination.index === source.index) {
                  console.log('Source and destination indexes are same, no reorder needed');
                  return;
                }
                
                if (!gallery?.images) {
                  console.error('Gallery images not available');
                  toast({
                    title: "Error",
                    description: "Unable to reorder images. Please try again.",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Log the current state
                console.log('Current gallery state:', {
                  totalImages: gallery.images.length,
                  sourceIndex: source.index,
                  destinationIndex: destination.index,
                  draggableId: result.draggableId
                });
                
                try {
                  console.log('Processing drag end:', {
                    sourceIndex: source.index,
                    destinationIndex: destination.index,
                    totalImages: gallery.images.length,
                  });
                  
                  // Get visible images (either all or only starred)
                  const visibleImages = gallery.images.filter(img => !showStarredOnly || img.starred);
                  
                  // Create a new array and perform the move
                  const reorderedImages = Array.from(visibleImages);
                  const [removed] = reorderedImages.splice(source.index, 1);
                  reorderedImages.splice(destination.index, 0, removed);
                  
                  // Create a new array with updated positions
                  const updatedImages = gallery.images.map(img => {
                    const newIndex = reorderedImages.findIndex(rImg => rImg.id === img.id);
                    return {
                      ...img,
                      position: newIndex >= 0 ? newIndex : img.position
                    };
                  });
                  
                  // Get the order of image IDs
                  const newOrder = updatedImages
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map(img => img.id);
                  
                  console.log('Reordering images:', {
                    visibleImages: visibleImages.length,
                    reorderedImages: reorderedImages.length,
                    newOrder,
                  });
                  
                  // Optimistically update the UI
                  queryClient.setQueryData([`/api/galleries/${slug}`], {
                    ...gallery,
                    images: updatedImages
                  });
                  
                  // Update the backend
                  reorderImageMutation.mutate(newOrder, {
                    onError: (error) => {
                      console.error('Failed to save reorder:', error);
                      // Revert optimistic update
                      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
                      toast({
                        title: "Error",
                        description: "Failed to save the new order. Please try again.",
                        variant: "destructive"
                      });
                    }
                  });
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
                      .map((image, index) => {
                        const draggableId = `image-${image.id}`;
                        console.log('Rendering draggable:', { id: image.id, draggableId, index });
                        return (
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
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStarMutation.mutate(image.id);
                                    }}
                                  >
                                    {image.starred ? (
                                      <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
                                    ) : (
                                      <Star className="h-4 w-4 transition-all duration-300 hover:scale-110" />
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
              className="flex -ml-4 w-[calc(100%+1rem)]"
              columnClassName="pl-4 bg-background"
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
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarMutation.mutate(image.id);
                        }}
                      >
                        {image.starred ? (
                          <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
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
              variant="secondary"
              size="icon"
              className="h-12 w-12 bg-background/95 hover:bg-background shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarMutation.mutate(selectedImage!.id);
              }}
            >
              {selectedImage?.starred ? (
                <StarIcon className="h-8 w-8 fill-yellow-400 text-yellow-400 transition-all duration-300 scale-110" />
              ) : (
                <Star className="h-8 w-8 transition-all duration-300 hover:scale-110" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`h-12 w-12 bg-background/95 hover:bg-background shadow-lg ${isAnnotationMode ? 'bg-primary/20' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsAnnotationMode(!isAnnotationMode);
                setNewCommentPos(null);
              }}
            >
              <Paintbrush className={`h-8 w-8 transition-all duration-300 hover:scale-110 ${isAnnotationMode ? 'text-primary' : ''}`} />
            </Button>
          </div>
          {selectedImage && (
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => {
                // Only handle clicks when in annotation mode and not drawing
                if (!isAnnotationMode || e.target === e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setNewCommentPos({ x, y });
                setIsAnnotationMode(false); // Exit annotation mode after placing a comment
              }}
            >
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt=""
                  className="max-h-[calc(90vh-3rem)] max-w-[calc(90vw-3rem)] w-auto h-auto object-contain"
                />
                <DrawingCanvas
                  width={selectedImage.width}
                  height={selectedImage.height}
                  isDrawing={isAnnotationMode}
                  savedPaths={annotations}
                  onSavePath={async (pathData) => {
                    try {
                      await fetch(`/api/images/${selectedImage.id}/annotations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pathData })
                      });
                      
                      // Refresh annotations
                      queryClient.invalidateQueries({
                        queryKey: [`/api/images/${selectedImage.id}/annotations`]
                      });
                      
                      toast({
                        title: "Annotation saved",
                        description: "Your drawing has been saved successfully.",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to save annotation. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>
              
              {/* Existing comments */}
              {comments.map((comment) => (
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
              {newCommentPos && (
                <CommentBubble
                  x={newCommentPos.x}
                  y={newCommentPos.y}
                  isNew
                  savedAuthor={userName}
                  onSubmit={(content, author) => {
                    setUserName(author); // Save the username for future comments
                    createCommentMutation.mutate({
                      imageId: selectedImage.id,
                      content,
                      author,
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
      {/* Fixed scale slider */}
        <div className="fixed bottom-6 right-6 z-50 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Scale: {scale}%</span>
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={50}
              max={150}
              step={10}
              className="w-[200px]"
            />
          </div>
        </div>
    </div>
  );
}