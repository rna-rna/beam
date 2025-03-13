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
import { Input } from "@/components/ui/input";
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
    <div className="flex h-screen">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 bg-background flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <DashboardSidebar />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold">Recent Galleries</h1>
            </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search galleries..."
                className="pl-8 w-[200px] md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Toggle
              pressed={isListView}
              onPressedChange={setIsListView}
              variant="outline"
              size="sm"
              aria-label="Toggle list view"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Button onClick={() => (window.location.href = "/new")}>
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <GallerySkeleton count={12} />
          ) : filteredGalleries.length > 0 ? (
            <div className={isListView ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}>
              {filteredGalleries.map((gallery) => (
                <ContextMenu key={gallery.id}>
                  <ContextMenuTrigger>
                    <Card
                      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${isListView ? 'flex' : ''}`}
                      onClick={(e) => {
                        if (e.button === 2) return;
                        setLocation(`/g/${gallery.slug}`);
                      }}
                    >
                      <div className={`${isListView ? 'w-24 h-24 shrink-0' : 'aspect-video'} relative bg-muted`}>
                        {gallery.thumbnailUrl ? (
                          <img
                            src={gallery.thumbnailUrl}
                            alt={gallery.title}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1">
                        <h3 className="font-medium line-clamp-1">{gallery.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {gallery.imageCount || 0} images
                        </p>
                        {isListView && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Last viewed {dayjs(gallery.lastViewedAt).fromNow()}
                          </p>
                        )}
                      </div>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setLocation(`/g/${gallery.slug}`)}>
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
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No recent galleries found</h3>
              <p className="text-sm text-muted-foreground">
                Galleries you view will show up here
              </p>
            </div>
          )}
        </div>
      </main>

      {renameGallery && (
        <RenameGalleryModal
          isOpen={!!renameGallery}
          onClose={() => setRenameGallery(null)}
          gallery={renameGallery}
        />
      )}

      {deleteGallery && (
        <DeleteGalleryModal
          isOpen={!!deleteGallery}
          onClose={() => setDeleteGallery(null)}
          gallery={deleteGallery}
        />
      )}
    </div>
  );
}