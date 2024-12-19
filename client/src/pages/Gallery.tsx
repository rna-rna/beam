import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Masonry from "react-masonry-css";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useParams } from "wouter";
import { X, MessageCircle, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommentBubble } from "@/components/CommentBubble";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  
  const { data: gallery, isLoading } = useQuery<{ images: any[] }>({
    queryKey: [`/api/galleries/${slug}`],
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

  // Add and remove keyboard event listeners
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

  const flagImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await fetch(`/api/images/${imageId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to flag image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      toast({
        title: "Image flagged",
        description: "The image has been flagged successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to flag image. Please try again.",
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

  const breakpointCols = {
    default: 4,
    1536: 3,
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
    <>
      <div className="container mx-auto px-4 py-8">
        <Masonry
          breakpointCols={breakpointCols}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-background"
        >
          {gallery.images.map((image: any) => (
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
                    variant={image.flagged ? "destructive" : "secondary"}
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      flagImageMutation.mutate(image.id);
                    }}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Masonry>
      </div>

      <Dialog open={selectedImageIndex >= 0} onOpenChange={(open) => {
        if (!open) {
          setSelectedImageIndex(-1);
          setNewCommentPos(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur border-none">
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
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
          >
            <X className="h-6 w-6 text-white" />
            <span className="sr-only">Close</span>
          </button>
          {selectedImage && (
            <div 
              className="relative w-full h-full"
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
                className="w-full h-full object-contain"
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
    </>
  );
}
