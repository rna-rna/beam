import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as ReactDOM from "react-dom/client";

dayjs.extend(relativeTime);
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Search, Clock, Plus, List, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { DashboardHeader } from "@/components/DashboardHeader"; // Added import


import { GallerySkeleton } from "@/components/GallerySkeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// New GalleryCard component
const GalleryCard = ({ gallery, isListView, onShare, onRename, onDelete }) => {
  return (
    <ContextMenu key={gallery.id}>
      <ContextMenuTrigger>
        <Card
          className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${isListView ? 'flex' : ''}`}
          onClick={(e) => {
            // Don't navigate if right-clicked
            if (e.button === 2) return;
            //setLocation(`/g/${gallery.slug}`); // Navigation handled elsewhere
          }}
        >
          <div className={`${isListView ? 'w-24 h-24 shrink-0' : 'aspect-video'} relative bg-muted`}>
            {gallery.thumbnailUrl && (
              <img
                src={gallery.thumbnailUrl}
                alt={gallery.title}
                className={`object-cover w-full h-full ${isListView ? 'rounded-l' : ''}`}
              />
            )}
          </div>
          <div className={`p-4 flex-grow ${isListView ? 'flex justify-between items-center' : ''}`}>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{gallery.title}</h3>
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => window.location.href = `/g/${gallery.slug}`}> {/*Direct navigation*/}
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

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/recent-galleries'],
    queryFn: async () => {
      const res = await fetch('/api/recent-galleries');
      if (!res.ok) {
        throw new Error('Failed to fetch recent galleries');
      }
      return res.json();
    },
    refetchInterval: 30000
  });

  const filteredGalleries = galleries.filter(gallery => {
    return gallery.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const [renameGallery, setRenameGallery] = useState(null);
  const [deleteGallery, setDeleteGallery] = useState(null);

  const handleRename = (gallery) => {
    setRenameGallery(gallery);
  };

  const handleDelete = (gallery) => {
    setDeleteGallery(gallery);
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:block w-64 border-r h-screen sticky top-0">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <DashboardHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} setIsListView={setIsListView} isListView={isListView} setLocation={setLocation}/> {/* Replaced header */}

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <GallerySkeleton count={12} />
          ) : filteredGalleries.length > 0 ? (
            <div className={isListView ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
              {filteredGalleries.map((gallery) => (
                <GalleryCard
                  key={gallery.id}
                  gallery={gallery}
                  isListView={isListView}
                  onShare={handleShare}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No recent galleries found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search or filters' : "You haven't viewed any galleries yet"}
              </p>
            </div>
          )}
        </div>
      </main>

      {renameGallery && (
        <Dialog open onOpenChange={() => setRenameGallery(null)}>
          <DialogContent>
            <RenameGalleryModal
              isOpen={true}
              onClose={() => {
                setRenameGallery(null);
                //queryClient.invalidateQueries(['/api/recent-galleries']); // queryClient is not defined
              }}
              galleryId={renameGallery.id}
              currentTitle={renameGallery.title}
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

                  //queryClient.invalidateQueries(['/api/recent-galleries']); // queryClient is not defined
                  setDeleteGallery(null);
                } catch (error) {
                  console.error('Error deleting gallery:', error);
                }
              }}
              gallerySlug={deleteGallery.slug}
              galleryTitle={deleteGallery.title}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}