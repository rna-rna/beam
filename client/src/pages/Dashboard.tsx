import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Image as ImageIcon, Clock, Trash2 } from "lucide-react";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Gallery } from "@db/schema";
import { formatRelativeDate } from "@/lib/format-date";

interface GalleryWithThumbnail extends Gallery {
  thumbnailUrl: string | null;
  imageCount: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [galleryToDelete, setGalleryToDelete] = useState<GalleryWithThumbnail | null>(null);

  // Query galleries
  const { data: galleries = [], isLoading } = useQuery<GalleryWithThumbnail[]>({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to fetch galleries');
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Create gallery mutation
  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const error = await res.text();
        console.error('Gallery creation error:', error);
        throw new Error(error || 'Failed to create gallery');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      setLocation(`/g/${data.slug}`);
      toast({
        title: "Success",
        description: "New gallery created successfully",
      });
    },
    onError: (error) => {
      console.error('Gallery creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create gallery. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete gallery mutation
  const deleteGalleryMutation = useMutation({
    mutationFn: async (gallery: GalleryWithThumbnail) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallery.slug}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to delete gallery');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      toast({
        title: "Success",
        description: "Gallery deleted successfully",
      });
      setGalleryToDelete(null);
    },
    onError: (error) => {
      console.error('Gallery deletion error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete gallery. Please try again.",
        variant: "destructive",
      });
      setGalleryToDelete(null);
    },
  });

  return (
    <AnimatedLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6">My Galleries</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Gallery Card */}
          <Card className="group hover:shadow-lg transition-all duration-200">
            <div className="aspect-[4/3] relative">
              <Button
                variant="ghost"
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 hover:bg-muted/50"
                onClick={() => createGalleryMutation.mutate()}
                disabled={createGalleryMutation.isPending}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Create New Gallery</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a new collection of images
                  </p>
                </div>
              </Button>
            </div>
          </Card>

          {/* Gallery Cards */}
          {galleries.map((gallery) => (
            <Card
              key={gallery.id}
              className="group hover:shadow-lg transition-all duration-200 relative"
            >
              <div
                className="cursor-pointer"
                onClick={() => setLocation(`/g/${gallery.slug}`)}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  {gallery.thumbnailUrl ? (
                    <img
                      src={gallery.thumbnailUrl}
                      alt={gallery.title}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <h3 className="text-lg font-semibold line-clamp-1 mb-1">
                    {gallery.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    <span>{gallery.imageCount} images</span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4" />
                    <span>{formatRelativeDate(gallery.createdAt)}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryToDelete(gallery);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Gallery</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{gallery.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => {
                            e.stopPropagation();
                            setGalleryToDelete(null);
                          }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGalleryMutation.mutate(gallery);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {galleries.length === 0 && !isLoading && (
          <div className="text-center mt-12">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No galleries yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first gallery to start organizing your images.
            </p>
          </div>
        )}
      </div>
    </AnimatedLayout>
  );
}