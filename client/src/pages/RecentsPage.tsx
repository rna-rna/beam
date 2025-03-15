import { useState, useEffect, useRef, MouseEvent, DragEvent } from 'react';
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as ReactDOM from "react-dom/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { Loader2, Search, Clock, Plus, List, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { GallerySkeleton } from "@/components/GallerySkeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

dayjs.extend(relativeTime);
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";

const ITEMS_PER_PAGE = 12;

interface Gallery {
  id: number;
  name: string;
  slug: string;
  imageCount?: number;
  thumbnailUrl?: string;
  lastViewedAt?: string;
  isOwner?: boolean;
  isPublic?: boolean;
  isFolder?: boolean;
  type?: 'gallery' | 'folder';
  sharedBy?: {
    firstName?: string;
    lastName?: string;
  };
  galleryCount?: number;
  createdAt: string;
  userId: string;
}

interface GalleryCardProps {
  gallery: Gallery;
  isListView: boolean;
  onShare: (gallery: Gallery) => void;
  onRename: (gallery: Gallery) => void;
  onDelete: (gallery: Gallery) => void;
  onNavigate: (slug: string) => void;
  selection: SelectionState;
  setSelection: (updater: (prev: SelectionState) => SelectionState) => void;
  filteredGalleries: Gallery[];
  queryClient: any; // You might want to use the proper type from @tanstack/react-query
}

interface SelectionState {
  selectedIds: Set<number>;
  lastSelectedId: number | null;
  isDragging: boolean;
  draggedItems: Gallery[];
}

const GalleryCard = ({ 
  gallery, 
  isListView, 
  onShare, 
  onRename, 
  onDelete, 
  onNavigate,
  isSelected,
  onSelect,
  onDoubleClick,
  isDragging,
  selectedCount = 1,
  selection,
  setSelection,
  filteredGalleries,
  queryClient
}: GalleryCardProps & {
  isSelected: boolean;
  onSelect: (e: MouseEvent) => void;
  onDoubleClick: () => void;
  isDragging: boolean;
  selectedCount?: number;
}) => {
  const createDragImage = (e: DragEvent) => {
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed left-0 top-0 pointer-events-none';
    
    if (selectedCount > 1) {
      // Create stacked appearance for multiple items
      dragPreview.innerHTML = `
        <div class="relative w-48" style="transform: rotate(-2deg)">
          ${selectedCount > 2 ? `
            <div class="absolute -right-6 -bottom-6 w-48 bg-background border rounded-lg shadow-md overflow-hidden opacity-60"
                 style="transform: rotate(6deg)">
              <div class="aspect-video relative bg-muted">
                <div class="absolute inset-0 bg-muted"></div>
              </div>
              <div class="p-2 bg-background">
                <div class="h-3 bg-muted/50 rounded w-2/3"></div>
              </div>
            </div>
          ` : ''}
          ${selectedCount > 1 ? `
            <div class="absolute -right-3 -bottom-3 w-48 bg-background border rounded-lg shadow-md overflow-hidden opacity-75"
                 style="transform: rotate(3deg)">
              <div class="aspect-video relative bg-muted">
                <div class="absolute inset-0 bg-muted"></div>
              </div>
              <div class="p-2 bg-background">
                <div class="h-3 bg-muted/50 rounded w-2/3"></div>
              </div>
            </div>
          ` : ''}
          <div class="relative w-48 bg-background border rounded-lg shadow-lg overflow-hidden">
            <div class="aspect-video relative bg-muted">
              ${gallery.thumbnailUrl ? `
                <img
                  src="${gallery.thumbnailUrl}"
                  alt="${gallery.name}"
                  class="object-cover w-full h-full"
                />
              ` : ''}
            </div>
            <div class="p-2">
              <div class="font-semibold text-sm truncate">${gallery.name}</div>
              <div class="flex justify-between items-center">
                <div class="text-xs text-muted-foreground">${gallery.imageCount || 0} images</div>
                <div class="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  ${selectedCount} selected
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Single item preview
      dragPreview.innerHTML = `
        <div class="w-48 bg-background border rounded-lg shadow-lg overflow-hidden opacity-90">
          <div class="aspect-video relative bg-muted">
            ${gallery.thumbnailUrl ? `
              <img
                src="${gallery.thumbnailUrl}"
                alt="${gallery.name}"
                class="object-cover w-full h-full"
              />
            ` : ''}
          </div>
          <div class="p-2">
            <div class="font-semibold text-sm truncate">${gallery.name}</div>
            <div class="text-xs text-muted-foreground">${gallery.imageCount || 0} images</div>
          </div>
        </div>
      `;
    }

    // Add to DOM temporarily for drag operation
    document.body.appendChild(dragPreview);

    // Set the drag image with offset for stacked effect
    e.dataTransfer.setDragImage(dragPreview, selectedCount > 1 ? 36 : 24, selectedCount > 1 ? 36 : 24);

    // Remove the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetGallery: Gallery) => {
    e.preventDefault();
    
    try {
      // Log the raw data transfer data for debugging
      console.log('[Drop Raw Data]', e.dataTransfer.getData('application/json'));
      
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('[Drop Event]', {
        data,
        targetGallery,
        isFolder: targetGallery.isFolder,
        targetId: targetGallery.id
      });

      if (data.type !== 'gallery') {
        console.log('[Drop Rejected] Invalid type:', data.type);
        return;
      }

      const sourceIds = data.ids;
      if (!sourceIds.length) {
        console.log('[Drop Rejected] No source IDs');
        return;
      }

      // Validate we're not trying to drop into one of the selected items
      if (sourceIds.includes(targetGallery.id)) {
        console.log('[Drop Rejected] Cannot drop into selected item');
        return;
      }

      // Validate target is a folder
      if (!targetGallery.isFolder) {
        console.log('[Drop Rejected] Target is not a folder');
        return;
      }

      console.log('[Moving Galleries]', {
        sourceIds,
        targetSlug: targetGallery.slug,
        targetId: targetGallery.id
      });

      // Make API call to move galleries to folder
      const response = await fetch(`/api/galleries/${targetGallery.slug}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          galleryIds: sourceIds,
        }),
      });

      const result = await response.json();
      console.log('[Move Response]', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to move galleries');
      }

      // Clear selection and refresh data
      setSelection(prev => ({
        ...prev,
        selectedIds: new Set(),
        lastSelectedId: null,
        isDragging: false,
        draggedItems: []
      }));
      
      // Invalidate and refetch queries
      console.log('[Refreshing Data]');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/galleries'] })
      ]);

      // Refetch the current page to update the UI immediately
      await queryClient.refetchQueries({ queryKey: ['/api/recent-galleries'] });
      console.log('[Data Refresh Complete]');

    } catch (error) {
      console.error('[Drop Error]', error);
      // TODO: Add error toast here
    }
  };

  return (
    <ContextMenu key={gallery.id}>
      <ContextMenuTrigger>
        <div 
          className="p-0.5"
          onDragOver={(e) => {
            // Log the gallery data for debugging
            console.log('[Gallery Data on DragOver]', {
              id: gallery.id,
              title: gallery.name,
              isFolder: gallery.isFolder,
              type: gallery.type,
              raw: gallery
            });

            // Only allow dropping if this is a folder and not the dragged item
            if (gallery.isFolder && !selection.selectedIds.has(gallery.id)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              
              // Add visual feedback for valid drop target
              const cardElement = e.currentTarget.querySelector('.card');
              if (cardElement) {
                cardElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                console.log('[Valid Drop Target]', {
                  targetId: gallery.id,
                  targetTitle: gallery.name,
                  isFolder: gallery.isFolder
                });
              }
            } else {
              console.log('[Invalid Drop Target]', {
                targetId: gallery.id,
                targetTitle: gallery.name,
                isFolder: gallery.isFolder,
                isSelected: selection.selectedIds.has(gallery.id),
                reason: !gallery.isFolder ? 'Not a folder' : 'Is selected item'
              });
            }
          }}
          onDragLeave={(e) => {
            // Remove visual feedback
            const cardElement = e.currentTarget.querySelector('.card');
            if (cardElement) {
              cardElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }
          }}
          onDrop={(e) => {
            // Remove visual feedback
            const cardElement = e.currentTarget.querySelector('.card');
            if (cardElement) {
              cardElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }

            if (gallery.isFolder && !selection.selectedIds.has(gallery.id)) {
              handleDrop(e, gallery);
            }
          }}
        >
          <Card
            className={`card overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${
              isListView ? 'flex' : ''
            } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${
              isDragging ? 'opacity-50' : ''
            } ${gallery.isFolder ? 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2' : ''}`}
            onClick={onSelect}
            onDoubleClick={onDoubleClick}
            draggable
            onDragStart={(e) => {
              createDragImage(e);
              const dragData = {
                type: 'gallery',
                ids: Array.from(selection.selectedIds.size > 0 ? selection.selectedIds : [gallery.id])
              };
              console.log('[Drag Start]', dragData);
              e.dataTransfer.setData('application/json', JSON.stringify(dragData));
              e.dataTransfer.effectAllowed = 'move';
              setSelection(prev => ({
                ...prev,
                isDragging: true,
                draggedItems: filteredGalleries.filter(g => 
                  selection.selectedIds.size > 0 
                    ? selection.selectedIds.has(g.id)
                    : g.id === gallery.id
                )
              }));
            }}
            onDragEnd={() => {
              setSelection(prev => ({
                ...prev,
                isDragging: false,
                draggedItems: []
              }));
            }}
          >
            <div className={`${isListView ? 'w-24 h-24 shrink-0' : 'aspect-video'} relative bg-muted flex items-center justify-center`}>
              {gallery.isFolder ? (
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              ) : gallery.thumbnailUrl ? (
                <img
                  src={gallery.thumbnailUrl}
                  alt={gallery.name}
                  className={`object-cover w-full h-full ${isListView ? 'rounded-l' : ''}`}
                />
              ) : null}
            </div>
            <div className={`p-4 flex-grow ${isListView ? 'flex justify-between items-center' : ''}`}>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{gallery.name}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {gallery.imageCount || 0} images
                  </p>
                  {!gallery.lastViewedAt && !gallery.isOwner && (
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      Invited
                    </span>
                  )}
                </div>
              </div>
              <div className={`${isListView ? 'flex items-center gap-8' : 'flex items-center justify-between mt-2'} text-xs text-muted-foreground`}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {gallery.lastViewedAt ? dayjs(gallery.lastViewedAt).fromNow() : 'Never viewed'}
                </div>
                <span className="flex items-center gap-1">
                  {gallery.isOwner ? 'Owned by you' : `Shared by ${gallery.sharedBy?.firstName || ''} ${gallery.sharedBy?.lastName || ''}`}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onNavigate(gallery.slug)}>
          <FolderOpen className="mr-2 h-4 w-4" /> Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onShare(gallery)}>
          <Share className="mr-2 h-4 w-4" /> Share
        </ContextMenuItem>
        {gallery.isOwner && (
          <ContextMenuItem onClick={() => onRename(gallery)}>
            <Pencil className="mr-2 h-4 w-4" /> Rename
          </ContextMenuItem>
        )}
        {gallery.isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600"
              onClick={() => onDelete(gallery)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default function RecentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [renameGallery, setRenameGallery] = useState<Gallery | null>(null);
  const [deleteGallery, setDeleteGallery] = useState<Gallery | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    selectedIds: new Set(),
    lastSelectedId: null,
    isDragging: false,
    draggedItems: []
  });
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();

  // Query for recent galleries and folders
  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['/api/recent-galleries'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/recent-galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`);
      if (!res.ok) {
        throw new Error('Failed to fetch recent galleries');
      }
      const data = await res.json();
      return data.map(gallery => ({
        ...gallery,
        name: gallery.title || gallery.name,
        isFolder: Boolean(gallery.isFolder || gallery.type === 'folder'),
        type: gallery.type || (gallery.isFolder ? 'folder' : 'gallery'),
        lastViewedAt: gallery.lastViewedAt || gallery.createdAt
      }));
    },
    getNextPageParam: (lastPage, allPages) => {
      const hasNext = lastPage.length === ITEMS_PER_PAGE;
      return hasNext ? allPages.length + 1 : undefined;
    },
  });

  const galleries = (data?.pages ?? []).flat();
  const filteredGalleries = galleries.filter(gallery => 
    (gallery?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  console.log('[Gallery Data]', {
    galleries,
    filtered: filteredGalleries,
    sample: filteredGalleries[0]
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        console.log('Intersection observer triggered:', {
          isIntersecting: entries[0].isIntersecting,
          hasNextPage,
          isFetching
        });
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { 
        threshold: 0,
        rootMargin: '100px'
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  const handleShare = (gallery) => {
    const url = `${window.location.origin}/g/${gallery.slug}`;
    const modal = document.createElement("div");
    modal.id = `share-modal-${gallery.id}`;
    document.body.appendChild(modal);
    const root = ReactDOM.createRoot(modal);
    root.render(
      <Dialog open onOpenChange={() => {
        root.unmount();
        modal.remove();
      }}>
        <DialogContent>
          <ShareModal
            isOpen={true}
            onClose={() => {
              root.unmount();
              modal.remove();
            }}
            galleryUrl={url}
            slug={gallery.slug}
            isPublic={gallery.isPublic}
            onVisibilityChange={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  };

  const handleRename = (gallery) => {
    setRenameGallery(gallery);
  };

  const handleDelete = (gallery) => {
    setDeleteGallery(gallery);
  };

  const handleNavigate = (slug: string) => {
    setLocation(`/g/${slug}`);
  };

  const handleSelect = (gallery: Gallery) => (e: MouseEvent) => {
    e.preventDefault();
    
    if (e.shiftKey && selection.lastSelectedId) {
      // Find the indices of the last selected and current items
      const items = filteredGalleries;
      const lastIndex = items.findIndex(g => g.id === selection.lastSelectedId);
      const currentIndex = items.findIndex(g => g.id === gallery.id);
      
      // Select all items between them
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const newSelection = new Set(selection.selectedIds);
      
      for (let i = start; i <= end; i++) {
        newSelection.add(items[i].id);
      }
      
      setSelection(prev => ({
        ...prev,
        selectedIds: newSelection,
        lastSelectedId: gallery.id
      }));
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection for this item
      const newSelection = new Set(selection.selectedIds);
      if (newSelection.has(gallery.id)) {
        newSelection.delete(gallery.id);
      } else {
        newSelection.add(gallery.id);
      }
      
      setSelection(prev => ({
        ...prev,
        selectedIds: newSelection,
        lastSelectedId: gallery.id
      }));
    } else {
      // Single select
      setSelection(prev => ({
        ...prev,
        selectedIds: new Set([gallery.id]),
        lastSelectedId: gallery.id
      }));
    }
  };

  const handleDoubleClick = (gallery: Gallery) => {
    setLocation(`/g/${gallery.slug}`);
  };

  const createNewFolder = async () => {
    try {
      console.log('[Creating New Folder]');
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: 'New Folder',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Create Folder Error]', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'Failed to create folder');
      }

      const newFolder = await response.json();
      console.log('[New Folder Created]', newFolder);

      // Only invalidate and refetch the recent-galleries query
      await queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
      await queryClient.refetchQueries({ queryKey: ['/api/recent-galleries'] });
    } catch (error) {
      console.error('[Create Folder Error]', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="sticky top-0 z-10 bg-background">
        <DashboardHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isListView={isListView} 
          setIsListView={setIsListView}
          selectedCount={selection.selectedIds.size}
        >
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={createNewFolder}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </DashboardHeader>
      </div>

      <ScrollArea className="flex-1">
        {isFetching && galleries.length === 0 ? (
          <div className="p-4">
            <GallerySkeleton count={12} />
          </div>
        ) : filteredGalleries.length > 0 ? (
          <>
            <div 
              className={`p-3 ${
                isListView 
                  ? "flex flex-col gap-2" 
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              }`}
            >
              {filteredGalleries.map((gallery) => (
                <GalleryCard
                  key={gallery.id}
                  gallery={gallery}
                  isListView={isListView}
                  onShare={handleShare}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                  isSelected={selection.selectedIds.has(gallery.id)}
                  onSelect={handleSelect(gallery)}
                  onDoubleClick={() => handleDoubleClick(gallery)}
                  isDragging={selection.isDragging && selection.selectedIds.has(gallery.id)}
                  selectedCount={selection.selectedIds.size}
                  selection={selection}
                  setSelection={setSelection}
                  filteredGalleries={filteredGalleries}
                  queryClient={queryClient}
                />
              ))}
            </div>
            {hasNextPage && (
              <div 
                ref={loadMoreRef} 
                className="py-8 flex justify-center"
                style={{ minHeight: '100px' }}
              >
                {isFetching ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="h-4" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No recent galleries found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search or filters' : "You haven't viewed any galleries yet"}
            </p>
          </div>
        )}
      </ScrollArea>

      {renameGallery && (
        <Dialog open onOpenChange={() => setRenameGallery(null)}>
          <DialogContent>
            <RenameGalleryModal
              isOpen={true}
              onClose={() => {
                setRenameGallery(null);
                queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
              }}
              galleryId={renameGallery.id}
              currentTitle={renameGallery.name}
              slug={renameGallery.slug}
            />
          </DialogContent>
        </Dialog>
      )}

      {deleteGallery && (
        <Dialog open onOpenChange={() => setDeleteGallery(null)}>
          <DialogContent>
            <DeleteGalleryModal
              isOpen={true}
              onClose={() => setDeleteGallery(null)}
              onDelete={async () => {
                try {
                  const response = await fetch(`/api/galleries/${deleteGallery.slug}`, {
                    method: 'DELETE'
                  });

                  if (!response.ok) {
                    throw new Error('Failed to delete gallery');
                  }

                  queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
                  setDeleteGallery(null);
                } catch (error) {
                  console.error('Error deleting gallery:', error);
                }
              }}
              gallerySlug={deleteGallery.slug}
              galleryTitle={deleteGallery.name}
            />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}