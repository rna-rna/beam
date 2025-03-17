import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2, Clock, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GalleryCardGrid, Gallery, GalleryCardAction } from "@/components/GalleryCardGrid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface RestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count: number;
}

function RestoreDialog({ isOpen, onClose, onConfirm, count }: RestoreDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">Restore {count > 1 ? `${count} Galleries` : 'Gallery'}</h2>
          <p className="mb-4 text-muted-foreground">
            {count > 1 
              ? `Are you sure you want to restore these ${count} galleries?` 
              : 'Are you sure you want to restore this gallery?'
            }
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                count > 1 ? `Restore ${count} Galleries` : "Restore Gallery"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PermanentDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count: number;
}

function PermanentDeleteDialog({ isOpen, onClose, onConfirm, count }: PermanentDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">Permanently Delete {count > 1 ? `${count} Galleries` : 'Gallery'}</h2>
          <p className="mb-4 text-muted-foreground">
            {count > 1 
              ? `This will permanently delete these ${count} galleries. This action cannot be undone.` 
              : 'This will permanently delete this gallery. This action cannot be undone.'
            }
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                count > 1 ? `Delete ${count} Galleries Forever` : "Delete Gallery Forever"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to safely construct thumbnail URLs
function getValidThumbnailUrl(gallery: any): string | null {
  // Look for images with complete URLs
  if (Array.isArray(gallery.images) && gallery.images.length > 0) {
    const firstImage = gallery.images[0];
    if (firstImage.url) {
      // Use the direct CDN URL which should be accessible
      return firstImage.url;
    }
    
    // If it's an object with an ID, use the ID in the correct API format
    const firstImageId = typeof firstImage === 'object' ? firstImage.id : firstImage;
    // Use the correct format for the API endpoint - apparently it's '/api/image/' not '/api/images/'
    return `/api/image/${firstImageId}?size=thumb`;
  }
  
  // If thumbnailImageId exists, use it with the correct API path
  if (gallery.thumbnailImageId) {
    return `/api/image/${gallery.thumbnailImageId}?size=thumb`;
  }
  
  // If there's a thumbnailUrl that's a number or numeric string, use it as an image ID
  if (gallery.thumbnailUrl && !isNaN(Number(gallery.thumbnailUrl))) {
    return `/api/image/${gallery.thumbnailUrl}?size=thumb`;
  }
  
  // If there's a direct thumbnailUrl that seems valid (full URL or path)
  if (typeof gallery.thumbnailUrl === 'string' && 
      (gallery.thumbnailUrl.startsWith('http') || gallery.thumbnailUrl.startsWith('/'))) {
    return gallery.thumbnailUrl;
  }
  
  // Try ogImageUrl as a last resort
  if (gallery.ogImageUrl) {
    return gallery.ogImageUrl;
  }
  
  // Return null if no valid thumbnail source is available
  return null;
}

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [selectedGalleryForAction, setSelectedGalleryForAction] = useState<Gallery | null>(null);
  const loadMoreRef = useRef(null);

  const { data: trashedGalleries = [], isLoading } = useQuery({
    queryKey: ["/api/trash"],
    queryFn: async () => {
      try {
        console.log('[TrashPage] Fetching trash data...');
        const res = await fetch("/api/trash", {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          console.error(`[TrashPage] API error:`, {
            status: res.status,
            statusText: res.statusText
          });
          throw new Error("Failed to fetch trash");
        }
        
        const data = await res.json();
        
        // Transform the data to match the Gallery interface
        return data.map((gallery: any) => {
          // 1. First try to use the direct image URL
          let thumbnailUrl = null;
          
          if (Array.isArray(gallery.images) && gallery.images.length > 0) {
            // Prefer the full URL from the CDN which should work
            thumbnailUrl = gallery.images[0].url;
            console.log(`[TrashPage] Using direct CDN URL for gallery ${gallery.id}:`, thumbnailUrl);
          }
          
          // 2. Fall back to API endpoint if direct URL not available
          if (!thumbnailUrl && Array.isArray(gallery.images) && gallery.images.length > 0) {
            thumbnailUrl = `/api/image/${gallery.images[0].id}?size=thumb`;
            console.log(`[TrashPage] Using image ID API path for gallery ${gallery.id}:`, thumbnailUrl);
          }
          
          return {
            id: gallery.id,
            name: gallery.title || gallery.name,
            slug: gallery.slug,
            imageCount: gallery.imageCount || (gallery.images && gallery.images.length) || 0,
            thumbnailUrl, // Use the resolved thumbnail URL
            isOwner: true, // Assume the user owns the trashed galleries
            isFolder: false,
            createdAt: gallery.createdAt,
            userId: gallery.userId
          };
        });
      } catch (error) {
        console.error('[TrashPage] Error fetching trash:', error);
        throw error;
      }
    },
  });

  const filteredGalleries = trashedGalleries.filter((gallery: Gallery) => 
    (gallery?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  async function handleRestore(slugs: string[]) {
    try {
      // Use Promise.all to restore multiple galleries in parallel
      await Promise.all(
        slugs.map(async (slug) => {
          const res = await fetch(`/api/galleries/${slug}/restore`, { 
            method: "POST",
            credentials: 'include',
          });
          
          if (!res.ok) {
            console.error(`Failed to restore gallery ${slug}:`, res.statusText);
            throw new Error(`Failed to restore gallery ${slug}`);
          }
        })
      );
      
      await queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recent-galleries"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      
      // Clear the selection
      setSelectedIds(new Set());
      
      toast({
        title: "Success",
        description: slugs.length > 1 
          ? `${slugs.length} galleries have been restored` 
          : "Gallery has been restored",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to restore gallery",
        variant: "destructive"
      });
    }
  }

  async function handlePermanentDelete(slugs: string[]) {
    try {
      // Use Promise.all to delete multiple galleries in parallel
      await Promise.all(
        slugs.map(async (slug) => {
          const res = await fetch(`/api/galleries/${slug}/permanent-delete`, { 
            method: "DELETE",
            credentials: 'include',
          });
          
          if (!res.ok) {
            console.error(`Failed to permanently delete gallery ${slug}:`, res.statusText);
            throw new Error(`Failed to permanently delete gallery ${slug}`);
          }
        })
      );
      
      await queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      
      // Clear the selection
      setSelectedIds(new Set());
      
      toast({
        title: "Success",
        description: slugs.length > 1 
          ? `${slugs.length} galleries have been permanently deleted` 
          : "Gallery has been permanently deleted",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to permanently delete gallery",
        variant: "destructive"
      });
    }
  }

  const handleSelectionChange = (newSelectedIds: Set<number>) => {
    setSelectedIds(newSelectedIds);
  };

  // Define hover actions for the gallery cards
  const getCardActions = (gallery: Gallery): GalleryCardAction[] => [
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Restore",
      onClick: () => {
        setSelectedGalleryForAction(gallery);
        if (selectedIds.size > 1 && selectedIds.has(gallery.id)) {
          setShowRestoreDialog(true);
        } else {
          handleRestore([gallery.slug]);
        }
      }
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete Forever",
      onClick: () => {
        setSelectedGalleryForAction(gallery);
        if (selectedIds.size > 1 && selectedIds.has(gallery.id)) {
          setShowPermanentDeleteDialog(true);
        } else {
          handlePermanentDelete([gallery.slug]);
        }
      },
      variant: "destructive"
    }
  ];

  // Add context menu actions for the trash page
  const getCustomContextMenuItems = (gallery: Gallery) => [
    {
      label: "Restore",
      icon: <RefreshCw className="h-4 w-4 mr-2" />,
      onClick: () => {
        setSelectedGalleryForAction(gallery);
        // Check if this gallery is part of a multi-selection
        if (selectedIds.size > 1 && selectedIds.has(gallery.id)) {
          setShowRestoreDialog(true);
        } else {
          // Single gallery restore
          handleRestore([gallery.slug]);
        }
      }
    },
    {
      label: "Delete Forever",
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      onClick: () => {
        setSelectedGalleryForAction(gallery);
        // Check if this gallery is part of a multi-selection
        if (selectedIds.size > 1 && selectedIds.has(gallery.id)) {
          setShowPermanentDeleteDialog(true);
        } else {
          // Single gallery permanent delete
          handlePermanentDelete([gallery.slug]);
        }
      },
      isDanger: true
    }
  ];

  const getSelectedGalleries = () => {
    if (selectedGalleryForAction && selectedIds.size > 1 && selectedIds.has(selectedGalleryForAction.id)) {
      return trashedGalleries.filter((gallery: Gallery) => selectedIds.has(gallery.id));
    } else if (selectedGalleryForAction) {
      return [selectedGalleryForAction];
    }
    return trashedGalleries.filter((gallery: Gallery) => selectedIds.has(gallery.id));
  };

  const selectedGalleries = getSelectedGalleries();
  const selectedSlugs = selectedGalleries.map((gallery: Gallery) => gallery.slug);

  return (
    <DashboardLayout>
      <div className="sticky top-0 z-10 bg-background">
        <DashboardHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isListView={isListView} 
          setIsListView={setIsListView}
          selectedCount={selectedIds.size}
        >
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowRestoreDialog(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restore {selectedIds.size} selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowPermanentDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIds.size} selected forever
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DashboardHeader>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading trash...</p>
          </div>
        ) : filteredGalleries.length > 0 ? (
          <div className="p-3">
            <GalleryCardGrid 
              galleries={filteredGalleries}
              isListView={isListView}
              selectable={true}
              draggable={false}
              onSelectionChange={handleSelectionChange}
              customContextMenuItems={getCustomContextMenuItems}
              cardActions={getCardActions}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No items in trash</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Deleted galleries will appear here'}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Restore Dialog */}
      <RestoreDialog 
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        onConfirm={() => handleRestore(selectedSlugs)}
        count={selectedSlugs.length}
      />

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog 
        isOpen={showPermanentDeleteDialog}
        onClose={() => setShowPermanentDeleteDialog(false)}
        onConfirm={() => handlePermanentDelete(selectedSlugs)}
        count={selectedSlugs.length}
      />
    </DashboardLayout>
  );
}
