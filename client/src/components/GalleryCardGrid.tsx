import { useState, useEffect, useRef, MouseEvent, DragEvent } from 'react';
import * as ReactDOM from "react-dom/client";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { Clock, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Initialize dayjs extensions
dayjs.extend(relativeTime);

export interface Gallery {
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
  folderId?: number | null;
  createdAt: string;
  userId: string;
  sharedBy?: {
    firstName?: string;
    lastName?: string;
  };
  // For multi-delete functionality
  selectedGalleryIds?: number[];
}

interface SelectionState {
  selectedIds: Set<number>;
  lastSelectedId: number | null;
  isDragging: boolean;
  draggedItems: Gallery[];
}

// Interface for custom context menu items
export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  isDanger?: boolean;
}

// Interface for card hover actions
export interface GalleryCardAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
}

export interface GalleryCardGridProps {
  galleries: Gallery[];
  isListView?: boolean;
  selectable?: boolean;
  draggable?: boolean;
  onNavigate?: (slug: string) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
  onItemMoved?: (itemIds: number[], targetFolderId: number) => void;
  customContextMenuItems?: (gallery: Gallery) => ContextMenuItem[];
  cardActions?: (gallery: Gallery) => GalleryCardAction[];
}

export function GalleryCardGrid({
  galleries,
  isListView = false,
  selectable = true,
  draggable = true,
  onNavigate,
  onSelectionChange,
  onItemMoved,
  customContextMenuItems,
  cardActions
}: GalleryCardGridProps) {
  const [, setLocation] = useLocation();
  const [selection, setSelection] = useState<SelectionState>({
    selectedIds: new Set(),
    lastSelectedId: null,
    isDragging: false,
    draggedItems: []
  });
  const [renameGallery, setRenameGallery] = useState<Gallery | null>(null);
  const [deleteGallery, setDeleteGallery] = useState<Gallery | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Update parent component when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selection.selectedIds);
    }
  }, [selection.selectedIds, onSelectionChange]);

  // Handle clicks outside cards to clear selection
  useEffect(() => {
    if (!selectable) return;
    
    const handleDocumentClick = (e: MouseEvent) => {
      // Skip if no selections or if we're in the middle of a drag operation
      if (selection.selectedIds.size === 0 || selection.isDragging) return;
      
      // Check if the click is inside the container but not on a card
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        // Find the closest card element
        const closestCard = (e.target as Element).closest('.card');
        if (!closestCard) {
          // Click was in container but not on a card, clear selection
          console.log('[GalleryCardGrid] Clearing selection from container click');
          setSelection(prev => ({
            ...prev,
            selectedIds: new Set(),
            lastSelectedId: null
          }));
        }
      }
    };
    
    // Add event listener using capture phase to ensure it runs before card clicks
    document.addEventListener('click', handleDocumentClick as any, true);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick as any, true);
    };
  }, [selectable, selection.selectedIds, selection.isDragging]);

  const handleShare = (gallery: Gallery) => {
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
            isPublic={gallery.isPublic || false}
            onVisibilityChange={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  };

  const handleRename = (gallery: Gallery) => {
    setRenameGallery(gallery);
  };

  const handleDelete = (gallery: Gallery) => {
    // If we have selected items and the right-clicked gallery is among them,
    // delete all selected items
    if (selection.selectedIds.size > 0 && selection.selectedIds.has(gallery.id)) {
      // Get all selected galleries
      const selectedGalleries = galleries.filter(g => selection.selectedIds.has(g.id));
      
      console.log('[Delete] Deleting multiple galleries:', selectedGalleries.map(g => g.name));
      
      // Show delete modal with information about multiple selection
      setDeleteGallery({
        ...gallery,
        selectedGalleryIds: Array.from(selection.selectedIds)
      });
    } else {
      // Single gallery delete case (existing behavior)
      console.log('[Delete] Deleting single gallery:', gallery.name);
      setDeleteGallery(gallery);
    }
  };

  const handleNavigate = (slug: string) => {
    if (onNavigate) {
      onNavigate(slug);
    } else {
      setLocation(`/g/${slug}`);
    }
  };

  const handleSelect = (gallery: Gallery) => (e: MouseEvent) => {
    if (!selectable) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent document click from firing
    
    if (e.shiftKey && selection.lastSelectedId) {
      // Find the indices of the last selected and current items
      const items = galleries;
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
    handleNavigate(gallery.slug);
  };

  const createDragImage = (e: DragEvent<HTMLDivElement>, gallery: Gallery, selectedCount: number) => {
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

      // Call the onItemMoved callback if provided
      if (onItemMoved) {
        onItemMoved(sourceIds, targetGallery.id);
      } else {
        // Make API call to move galleries to folder
        const response = await fetch(`/api/galleries/${targetGallery.slug}/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include', // Important for auth cookies
          body: JSON.stringify({
            galleryIds: sourceIds,
          }),
        });

        // Check for HTML response (error)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const htmlText = await response.text();
          console.error('[Move Error] Received HTML instead of JSON:', htmlText.substring(0, 100) + '...');
          throw new Error('Received HTML response instead of JSON');
        }

        const result = await response.json();
        console.log('[Move Response]', result);

        if (!response.ok) {
          throw new Error(result.message || 'Failed to move galleries');
        }

        // Invalidate and refetch queries
        console.log('[Refreshing Data]');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/galleries'] }),
          queryClient.invalidateQueries({ queryKey: ['folder', targetGallery.slug] }),
          queryClient.invalidateQueries({ queryKey: ['folder-galleries', targetGallery.slug] })
        ]);

        // Refetch the current page to update the UI immediately
        await queryClient.refetchQueries({ queryKey: ['/api/recent-galleries'] });
        console.log('[Data Refresh Complete]');
      }

      // Clear selection after move
      setSelection(prev => ({
        ...prev,
        selectedIds: new Set(),
        lastSelectedId: null,
        isDragging: false,
        draggedItems: []
      }));

    } catch (error) {
      console.error('[Drop Error]', error);
      // TODO: Add error toast here
    }
  };

  // Render gallery cards
  const renderGalleryCard = (gallery: Gallery) => {
    const isSelected = selection.selectedIds.has(gallery.id);
    const isDragging = selection.isDragging && selection.selectedIds.has(gallery.id);
    const selectedCount = selection.selectedIds.size || 1;
    const isHovered = hoveredCardId === gallery.id;
    const actions = cardActions?.(gallery) || [];
    
    return (
      <ContextMenu key={gallery.id}>
        <ContextMenuTrigger>
          <div 
            className="p-0.5 group relative"
            onMouseEnter={() => setHoveredCardId(gallery.id)}
            onMouseLeave={() => setHoveredCardId(null)}
            onDragOver={(e) => {
              // Only allow dropping if this is a folder and not the dragged item
              if (gallery.isFolder && !selection.selectedIds.has(gallery.id)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Add visual feedback for valid drop target
                const cardElement = e.currentTarget.querySelector('.card');
                if (cardElement) {
                  cardElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                }
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
            {/* Hover action buttons */}
            {actions.length > 0 && (
              <div 
                className={cn(
                  "absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity", 
                  (isHovered || isSelected) && "opacity-100"
                )}
              >
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="icon"
                    variant={action.variant || "secondary"}
                    className="h-8 w-8 rounded-full shadow-md bg-background hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    title={action.label}
                  >
                    {action.icon}
                  </Button>
                ))}
              </div>
            )}

            <Card
              className={`card overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${
                isListView ? 'flex' : ''
              } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${
                isDragging ? 'opacity-50' : ''
              } ${gallery.isFolder ? 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2' : ''}`}
              onClick={handleSelect(gallery)}
              onDoubleClick={() => handleDoubleClick(gallery)}
              draggable={draggable}
              onDragStart={(e) => {
                if (!draggable) return;
                
                createDragImage(e, gallery, selectedCount);
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
                  draggedItems: galleries.filter(g => 
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
                    onError={(e) => {
                      // When image fails to load, replace with a placeholder icon
                      console.log(`[GalleryCardGrid] Thumbnail failed to load: ${gallery.thumbnailUrl}`);
                      e.currentTarget.style.display = 'none';
                      // Find the parent div and add an image icon
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const placeholderIcon = document.createElement('div');
                        placeholderIcon.className = 'flex items-center justify-center h-full w-full';
                        placeholderIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
                        parent.appendChild(placeholderIcon);
                      }
                    }}
                  />
                ) : (
                  // No thumbnail available, show placeholder
                  <div className="flex items-center justify-center h-full w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-muted-foreground">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                      <circle cx="9" cy="9" r="2"></circle>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                    </svg>
                  </div>
                )}
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
          {/* Default context menu items */}
          {!customContextMenuItems && (
            <>
              <ContextMenuItem onClick={() => handleNavigate(gallery.slug)}>
                <FolderOpen className="mr-2 h-4 w-4" /> Open
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleShare(gallery)}>
                <Share className="mr-2 h-4 w-4" /> Share
              </ContextMenuItem>
              {gallery.isOwner && (
                <ContextMenuItem onClick={() => handleRename(gallery)}>
                  <Pencil className="mr-2 h-4 w-4" /> Rename
                </ContextMenuItem>
              )}
              {gallery.isOwner && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-red-600"
                    onClick={() => handleDelete(gallery)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> 
                    {selection.selectedIds.size > 0 && selection.selectedIds.has(gallery.id) 
                      ? `Delete ${selection.selectedIds.size} Selected`
                      : "Delete"}
                  </ContextMenuItem>
                </>
              )}
            </>
          )}

          {/* Custom context menu items for specialized pages like Trash */}
          {customContextMenuItems && customContextMenuItems(gallery).map((item, index) => (
            <ContextMenuItem
              key={index}
              onClick={item.onClick}
              className={item.isDanger ? "text-red-600" : ""}
            >
              {item.icon}
              {item.label}
              {selection.selectedIds.size > 0 && selection.selectedIds.has(gallery.id) && item.label.includes("Delete") 
                ? ` ${selection.selectedIds.size} Selected` 
                : ""}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div 
        ref={containerRef}
        className={`${
          isListView 
            ? "flex flex-col gap-2" 
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        }`}
      >
        {galleries.map(renderGalleryCard)}
      </div>

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
                  // Check if we're deleting multiple galleries
                  if (deleteGallery.selectedGalleryIds && deleteGallery.selectedGalleryIds.length > 0) {
                    console.log('[Multi Delete] Deleting', deleteGallery.selectedGalleryIds.length, 'galleries');
                    
                    // Use Promise.all to delete all galleries in parallel
                    await Promise.all(
                      deleteGallery.selectedGalleryIds.map(async (id) => {
                        const galleryToDelete = galleries.find(g => g.id === id);
                        if (!galleryToDelete) return;
                        
                        const response = await fetch(`/api/galleries/${galleryToDelete.slug}`, {
                          method: 'DELETE',
                          credentials: 'include'
                        });
                        
                        if (!response.ok) {
                          console.error(`Failed to delete gallery ${galleryToDelete.name}:`, response.statusText);
                        }
                      })
                    );
                    
                    // Clear selection
                    setSelection(prev => ({
                      ...prev,
                      selectedIds: new Set(),
                      lastSelectedId: null
                    }));
                  } else {
                    // Single gallery delete (existing behavior)
                    const response = await fetch(`/api/galleries/${deleteGallery.slug}`, {
                      method: 'DELETE',
                      credentials: 'include'
                    });

                    if (!response.ok) {
                      throw new Error('Failed to delete gallery');
                    }
                  }

                  // Refresh data
                  queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
                  setDeleteGallery(null);
                } catch (error) {
                  console.error('Error deleting gallery:', error);
                }
              }}
              gallerySlug={deleteGallery.slug}
              galleryTitle={deleteGallery.name}
              selectedCount={deleteGallery.selectedGalleryIds?.length || 0}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 