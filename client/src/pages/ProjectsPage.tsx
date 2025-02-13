import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Clock, FolderOpen, Image, Menu, Pencil, Plus, Share, Trash2, List, Loader2 } from "lucide-react";
import { getR2Image } from "@/lib/r2";
import { Toggle } from "@/components/ui/toggle";
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import * as ReactDOM from "react-dom/client";

dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [renameGallery, setRenameGallery] = useState(null);
  const [deleteGallery, setDeleteGallery] = useState(null);
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: galleryPages = [], isFetching, hasNextPage, fetchNextPage } = useQuery({
    queryKey: ["/api/galleries", page],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === ITEMS_PER_PAGE ? pages.length + 1 : undefined;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
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

  const galleries = galleryPages.flat();
  const filteredGalleries = galleries.filter(gallery => 
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between p-4 border-b">
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
            <div className="relative w-64">
              <Input
                type="search"
                placeholder="Search projects..."
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => (window.location.href = "/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Gallery
            </Button>
            <Toggle
              pressed={isListView}
              onPressedChange={setIsListView}
              aria-label="Toggle list view"
            >
              <List className="h-4 w-4" />
            </Toggle>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          {filteredGalleries.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to get started</p>
              <Button onClick={() => (window.location.href = "/new")}>
                <Plus className="mr-2 h-4 w-4" /> New Gallery
              </Button>
            </div>
          ) : (
            <>
              <div className={isListView ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
                {filteredGalleries.map(gallery => (
                  <ContextMenu key={gallery.id}>
                    <ContextMenuTrigger>
                      <Card 
                        className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${isListView ? 'flex' : ''}`}
                        onClick={(e) => {
                          if (e.button === 2) return;
                          window.location.href = `/g/${gallery.slug}`;
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({
                            type: 'gallery',
                            id: gallery.id,
                            slug: gallery.slug
                          }));
                        }}
                      >
                        <div className={`${isListView ? 'w-24 h-24 shrink-0' : 'aspect-video'} relative bg-muted`}>
                          {gallery.thumbnailUrl ? (
                            <img
                              src={gallery.images?.[0] ? getR2Image(gallery.images[0], "thumb") : "/fallback-image.jpg"}
                              alt={gallery.title}
                              className={`object-cover w-full h-full ${isListView ? 'rounded-l' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Image className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className={`p-4 flex-grow ${isListView ? 'flex justify-between items-center' : ''}`}>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{gallery.title}</h3>
                            <div className="flex items-center gap-3">
                              <p className="text-sm text-muted-foreground">
                                {gallery.imageCount || 0} images
                              </p>
                            </div>
                          </div>
                          <div className={`${isListView ? 'flex items-center gap-8' : 'flex items-center justify-between mt-2'} text-xs text-muted-foreground`}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {gallery.lastViewedAt ? dayjs(gallery.lastViewedAt).fromNow() : 'Never viewed'}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => window.location.href = `/g/${gallery.slug}`}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleShare(gallery)}>
                        <Share className="mr-2 h-4 w-4" /> Share
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleRename(gallery)}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(gallery)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
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
                    // Spacer for intersection observer
                    <div className="h-4" />
                  )}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </main>

      {renameGallery && (
        <Dialog open onOpenChange={() => setRenameGallery(null)}>
          <DialogContent>
            <RenameGalleryModal
              isOpen={true}
              onClose={() => {
                setRenameGallery(null);
                queryClient.invalidateQueries(["/api/galleries"]);
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

                  queryClient.invalidateQueries(["/api/galleries"]);
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