import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Upload,
  Grid,
  Filter,
  MessageSquare,
  SquareDashedMousePointer,
  Download,
  Share2,
  Trash2,
  CheckCircle,
  Loader2,
  Paintbrush,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth, useUser } from "@clerk/clerk-react";
import Masonry from "react-masonry-css";

// UI Components
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { Image, Gallery as GalleryType } from "@/types/gallery";

interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

function FloatingToolbar({
  selectedCount,
  onDeselect,
  onDelete,
  onDownload,
  onEdit,
}: {
  selectedCount: number;
  onDeselect: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEdit: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100]"
    >
      <div className="bg-background/80 backdrop-blur-lg border rounded-lg shadow-lg p-4 flex items-center gap-6">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Paintbrush className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit selected images</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected images</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download selected images</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onDeselect}>
                  Cancel Selection
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear selection</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}

export default function Gallery({ slug: propSlug, title, onHeaderActionsChange }: GalleryProps) {
  // URL Parameters and Global Hooks
  const params = useParams();
  const slug = propSlug || params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  // State Management
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showWithComments, setShowWithComments] = useState(false);
  const [showApproved, setShowApproved] = useState(false);

  // Query galleries
  const { data: gallery, isLoading } = useQuery<GalleryType>({
    queryKey: [`/api/galleries/${slug}`],
    queryFn: async () => {
      const token = await getToken();
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/galleries/${slug}`, {
        headers,
        cache: 'no-store',
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('This gallery is private');
        }
        if (res.status === 404) {
          throw new Error('Gallery not found');
        }
        throw new Error('Failed to fetch gallery');
      }

      return res.json();
    },
    enabled: !!slug,
    staleTime: 0,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Delete mutation
  const deleteImagesMutation = useMutation({
    mutationFn: async (imageIds: number[]) => {
      const token = await getToken();
      const response = await fetch(`/api/galleries/${slug}/images/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageIds })
      });
      if (!response.ok) throw new Error('Failed to delete images');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${slug}`] });
      setSelectedImages([]);
      setSelectMode(false);
      toast({
        title: "Success",
        description: "Selected images deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete images. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleImageSelect = (imageId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!selectMode) return;

    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDownloadSelected = async () => {
    if (!gallery || selectedImages.length === 0) return;

    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of selected images...",
      });

      const selectedImagesData = gallery.images.filter(img => 
        selectedImages.includes(img.id)
      );

      const zip = new JSZip();
      const imagePromises = selectedImagesData.map(async (image, index) => {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const extension = image.url.split('.').pop() || 'jpg';
        zip.file(`image-${index + 1}.${extension}`, blob);
      });

      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${gallery.title || 'gallery'}-selected-images.zip`);

      toast({
        title: "Success",
        description: "Selected images downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditSelected = () => {
    toast({
      title: "Coming Soon",
      description: "Bulk edit functionality will be available soon.",
    });
  };

  const handleDeleteSelected = () => {
    deleteImagesMutation.mutate(selectedImages);
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedImages([]);
    }
    setSelectMode(!selectMode);
  };

  // Render function for individual images
  const renderImage = (image: Image) => (
    <div
      key={image.id}
      className={`relative group ${selectMode ? 'cursor-pointer' : ''}`}
      onClick={(e) => handleImageSelect(image.id, e)}
    >
      <img
        src={image.url}
        alt={image.title || ''}
        className="w-full h-auto rounded-lg"
      />
      {selectMode && (
        <div className={`absolute inset-0 bg-primary/10 transition-colors ${
          selectedImages.includes(image.id) ? 'bg-primary/20' : ''
        }`}>
          <div className="absolute top-2 right-2">
            <div className={`w-6 h-6 rounded-full border-2 ${
              selectedImages.includes(image.id)
                ? 'bg-primary border-primary'
                : 'border-white'
            }`}>
              {selectedImages.includes(image.id) && (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Gallery controls for header
  const renderGalleryControls = useCallback(() => {
    if (!gallery) return null;

    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${selectMode ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={toggleSelectMode}
              >
                <SquareDashedMousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{selectMode ? "Exit Selection" : "Select Images"}</TooltipContent>
          </Tooltip>

          {/* Filter Menu */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-9 w-9 hover:bg-accent ${
                      (showStarredOnly || showWithComments || showApproved)
                        ? 'bg-accent/50'
                        : ''
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setShowStarredOnly(!showStarredOnly)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <Star className={`w-4 h-4 mr-2 ${showStarredOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        Show Starred
                      </div>
                      {showStarredOnly && <CheckCircle className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowWithComments(!showWithComments)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <MessageSquare className={`w-4 h-4 mr-2 ${showWithComments ? 'text-primary' : ''}`} />
                        Has Comments
                      </div>
                      {showWithComments && <CheckCircle className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowApproved(!showApproved)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <CheckCircle className={`w-4 h-4 mr-2 ${showApproved ? 'text-primary' : ''}`} />
                        Approved
                      </div>
                      {showApproved && <CheckCircle className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setShowStarredOnly(false);
                      setShowWithComments(false);
                      setShowApproved(false);
                    }}
                    className="text-sm text-muted-foreground"
                  >
                    Reset Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>Filter Images</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/10"
                onClick={() => {/* Handle share modal */}}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share Gallery</TooltipContent>
          </Tooltip>
          {selectMode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-destructive/90"
                    onClick={() => deleteImagesMutation.mutate(selectedImages)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Selected ({selectedImages.length})</TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>
      </div>
    );
  }, [
    gallery,
    selectMode,
    selectedImages.length,
    showStarredOnly,
    showWithComments,
    showApproved,
    toggleSelectMode,
    deleteImagesMutation
  ]);

  // Update header actions
  useEffect(() => {
    onHeaderActionsChange?.(renderGalleryControls());
  }, [onHeaderActionsChange, renderGalleryControls]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Gallery Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{gallery?.title || 'Loading...'}</h1>
            {renderGalleryControls()}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="relative">
          <Masonry
            breakpointCols={{
              default: 4,
              1536: 3,
              1024: 3,
              768: 2,
              640: 1,
            }}
            className="flex -ml-4 w-[calc(100%+1rem)]"
            columnClassName="pl-4"
          >
            {gallery?.images
              ?.filter(image => {
                if (showStarredOnly && !image.starred) return false;
                if (showWithComments && (!image.commentCount || image.commentCount === 0)) return false;
                if (showApproved && !image.approved) return false;
                return true;
              })
              .map(image => renderImage(image))}
          </Masonry>
        </div>
      </div>

      {/* Floating Toolbar */}
      <AnimatePresence>
        {selectMode && selectedImages.length > 0 && (
          <FloatingToolbar
            selectedCount={selectedImages.length}
            onDeselect={() => {
              setSelectedImages([]);
              setSelectMode(false);
            }}
            onDelete={handleDeleteSelected}
            onDownload={handleDownloadSelected}
            onEdit={handleEditSelected}
          />
        )}
      </AnimatePresence>
    </div>
  );
}