
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { cn } from "./lib/utils";
import GalleryLightbox from './GalleryLightbox';
import GalleryActions from './components/GalleryActions';
import { CursorOverlay } from "./components/CursorOverlay";
import { 
  X, ChevronLeft, ChevronRight, Eye, EyeOff, 
  MessageSquare, MessageSquarePlus, Loader2 
} from "lucide-react";
import { getR2Image } from "./lib/r2";
import { useTheme } from "./hooks/use-theme";
import { UploadProvider } from "./context/UploadContext";

export default function GalleryBeta({
  slug: propSlug,
  title,
  onHeaderActionsChange,
}: any) {
  // URL Parameters and Global Hooks first
  const params = useParams();
  const slug = propSlug || params?.slug;
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { isDark } = useTheme();

  // State Management
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(-1);
  const [showMobileView, setShowMobileView] = useState(false);
  const [cursors, setCursors] = useState<any[]>([]);

  // Fetch gallery data
  const {
    data: gallery,
    isLoading: isGalleryLoading,
    error,
  } = useQuery({
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      if (!slug) return null;
      
      console.log("Starting gallery fetch for slug:", slug);

      const token = await getToken();
      const headers: HeadersInit = {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/galleries/${slug}`, {
        headers,
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Gallery fetch failed:", {
          status: res.status,
          statusText: res.statusText,
        });
        if (res.status === 403) {
          throw new Error("This gallery is private");
        }
        if (res.status === 404) {
          throw new Error("Private Gallery");
        }
        throw new Error("Failed to fetch gallery");
      }

      const data = await res.json();
      return data;
    },
    enabled: !!slug,
  });

  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  
  useEffect(() => {
    setSelectedImage(gallery?.images?.[selectedImageIndex] ?? null);
  }, [selectedImageIndex, gallery?.images]);

  // Fetch comments for selected image
  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    error: commentsError,
  } = useQuery({
    queryKey: [`/api/images/${selectedImage?.id}/comments`],
    enabled: !!selectedImage?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      console.log("Fetched comments:", data);
    },
    onError: (err) => {
      console.error("Failed to fetch comments:", err);
    },
  });

  // Add mutation for updating comment positions
  const updateCommentPositionMutation = useMutation({
    mutationFn: async ({ commentId, x, y }: { commentId: number, x: number, y: number }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication failed');
      }

      // Check if user is authenticated
      if (!user || !user.id) {
        throw new Error('User authentication required');
      }

      console.log("Sending position update to server:", { commentId, x, y, userId: user.id });

      const response = await fetch(`/api/comments/${commentId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'X-User-ID': user.id
        },
        credentials: 'include',
        body: JSON.stringify({ x, y, userId: user.id })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update comment position:", errorText);
        throw new Error('Failed to update comment position');
      }

      const data = await response.json();
      console.log("Position update response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Comment position updated successfully:", data);
      // Invalidate comments query to refresh the UI
      if (selectedImage?.id) {
        // Force a refetch to get fresh data with updated positions
        queryClient.invalidateQueries({ queryKey: [`/api/images/${selectedImage.id}/comments`] });
        queryClient.refetchQueries({ queryKey: [`/api/images/${selectedImage.id}/comments`] });
      }
    },
    onError: (error) => {
      console.error("Error updating comment position:", error);
    }
  });

  // Handler for comment position changes
  const handleCommentPositionChange = (commentId: number, x: number, y: number) => {
    console.log("Comment position change in Gallery:", { commentId, x, y });

    // Update the comments cache immediately for a smooth experience
    queryClient.setQueryData([`/api/images/${selectedImage?.id}/comments`], (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map(comment => 
        comment.id === commentId 
          ? { ...comment, xPosition: x, yPosition: y } 
          : comment
      );
    });

    // Call the mutation to update the position on the server
    updateCommentPositionMutation.mutate({ commentId, x, y });
  };

  // Preload functions
  const preloadImage = useCallback((image: any, quality: string = "thumb") => {
    if (!image) return;
    
    const img = new Image();
    img.src = getR2Image(image, quality);
    
    return img;
  }, []);

  const preloadAdjacentImages = useCallback((index: number) => {
    if (!gallery?.images) return;
    
    const preloadRange = 2; // Preload 2 images before and after
    
    for (let i = -preloadRange; i <= preloadRange; i++) {
      if (i === 0) continue; // Skip current image
      
      const targetIndex = index + i;
      if (targetIndex >= 0 && targetIndex < gallery.images.length) {
        preloadImage(gallery.images[targetIndex], "lightbox");
      }
    }
  }, [gallery?.images, preloadImage]);

  const handleImageClick = (index: number) => {
    console.log("handleImageClick:", { isCommentPlacementMode });

    if (isMobile) {
      setMobileViewIndex(index);
      setShowMobileView(true);
      return;
    }

    const image = gallery?.images?.[index];
    if (!image) {
      console.error("No image found at index:", index);
      return;
    }

    setSelectedImage(image);
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
    preloadAdjacentImages(index);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error instanceof Error ? error.message : "Failed to load gallery"}</p>
        </div>
      </div>
    );
  }

  if (isGalleryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <UploadProvider>
      <>
        <CursorOverlay cursors={cursors} />
        {gallery && <GalleryActions gallery={gallery} />}

        <div
          className={cn(
            "relative w-full flex-1",
            isDark ? "bg-black/90" : "bg-background",
          )}
        >
          {/* Gallery content would go here */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold">Beta: {gallery?.title || 'Gallery'}</h2>
              <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-semibold">BETA</span>
            </div>
            
            {/* Simple gallery grid for demonstration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery?.images?.map((image, index) => (
                <div 
                  key={image.id} 
                  className="cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(index)}
                >
                  <img 
                    src={getR2Image(image, "thumb")} 
                    alt={image.originalFilename || 'Gallery image'} 
                    className="w-full h-auto object-cover aspect-square"
                  />
                </div>
              ))}
            </div>
          </div>

          {!isMobile && (
            <GalleryLightbox
              isOpen={isLightboxOpen}
              onClose={() => {
                setIsLightboxOpen(false);
                setSelectedImageIndex(-1);
                setNewCommentPos(null);
                setIsCommentPlacementMode(false);
              }}
              selectedImage={selectedImage}
              selectedImageIndex={selectedImageIndex}
              galleryImages={gallery?.images || []}
              onNavigate={(newIndex) => {
                setSelectedImageIndex(newIndex);
                preloadAdjacentImages(newIndex);
              }}
              gallery={gallery}
              comments={comments || []}
              onCommentPositionChange={handleCommentPositionChange}
              userRole="Edit" // Set default role for testing
            />
          )}
        </div>
      </>
    </UploadProvider>
  );
}
