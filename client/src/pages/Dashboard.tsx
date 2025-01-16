import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Grid, Image as ImageIcon, Clock, Trash2, Loader2 } from "lucide-react";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface GalleryWithThumbnail extends Gallery {
  thumbnailUrl: string | null;
  imageCount: number;
}

const LoginModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <p>Login Modal Content</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [galleryToDelete, setGalleryToDelete] = useState<GalleryWithThumbnail | null>(null);
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { data: galleries = [], isLoading } = useQuery<GalleryWithThumbnail[]>({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const token = await getToken();
      console.log('Fetching galleries with token:', token ? 'Present' : 'Missing');
      const res = await fetch('/api/galleries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        const error = await res.text();
        console.error('Gallery fetch failed:', { status: res.status, error });
        throw new Error(error || 'Failed to fetch galleries');
      }
      const data = await res.json();
      console.log('Dashboard Galleries:', {
        count: data.length,
        galleries: data.map(g => ({
          id: g.id,
          slug: g.slug,
          title: g.title,
          imageCount: g.imageCount,
          hasThumb: !!g.thumbnailUrl
        }))
      });
      return data;
    },
    enabled: !!user,
  });

  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingGallery(true);
      const token = await getToken();
      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        const error = await res.text();
        console.error('Gallery creation error:', error);
        throw new Error(error || 'Failed to create gallery');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
        await queryClient.prefetchQuery({
          queryKey: [`/api/galleries/${data.slug}`],
          queryFn: async () => {
            const token = await getToken();
            const res = await fetch(`/api/galleries/${data.slug}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            if (!res.ok) throw new Error('Failed to fetch new gallery');
            return res.json();
          }
        });

        setLocation(`/g/${data.slug}`);
        toast({
          title: "Success",
          description: "New gallery created successfully",
        });
      } catch (error) {
        console.error('Error after gallery creation:', error);
        toast({
          title: "Error",
          description: "Gallery created but failed to load. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingGallery(false);
      }
    },
    onError: (error) => {
      setIsCreatingGallery(false);
      console.error('Gallery creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create gallery. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    <AnimatedLayout title="My Galleries">
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-w-0">
            <Card className="group hover:shadow-lg transition-all duration-200">
              <div className="aspect-[4/3] relative">
                <Button
                  variant="ghost"
                  className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 hover:bg-muted/50"
                  onClick={() => createGalleryMutation.mutate()}
                  disabled={isCreatingGallery || createGalleryMutation.isPending}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {isCreatingGallery ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <Plus className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">
                      {isCreatingGallery ? "Creating Gallery..." : "Create New Gallery"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isCreatingGallery ? "Please wait..." : "Start a new collection of images"}
                    </p>
                  </div>
                </Button>
              </div>
            </Card>

            {galleries.map((gallery) => (
              <Card
                key={gallery.id}
                className="group hover:shadow-lg transition-all duration-200 overflow-hidden bg-card w-full"
              >
                <div
                  className="cursor-pointer h-full flex flex-col"
                  onClick={() => setLocation(`/g/${gallery.slug}`)}
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                    {gallery.thumbnailUrl ? (
                      <img
                        src={gallery.thumbnailUrl}
                        alt={gallery.title}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                    <h3 className="text-lg font-medium text-foreground/90 line-clamp-1 mb-2">
                      {gallery.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/75">
                      <Grid className="w-4 h-4" />
                      <span>{gallery.imageCount} images</span>
                      <span className="mx-1 text-muted-foreground/50">•</span>
                      <Clock className="w-4 h-4" />
                      <span>{formatRelativeDate(gallery.createdAt)}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground"
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
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {galleries.length === 0 && !isLoading && (
            <div className="text-center mt-12">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No galleries yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first gallery to start organizing your images.
              </p>
            </div>
          )}
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
      </div>
    </AnimatedLayout>
  );
}