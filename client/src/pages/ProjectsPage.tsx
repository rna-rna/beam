import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useLocation } from "wouter";
import { Loader2, Menu, List, LayoutGrid } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ShareModal } from "@/components/ShareModal";
import { RenameGalleryModal } from "@/components/RenameGalleryModal";
import { DeleteGalleryModal } from "@/components/DeleteGalleryModal";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GalleryCard } from "@/components/GalleryCard";
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, FolderOpen, Image, Pencil, Plus, Share, Trash2 } from "lucide-react";
import { getR2Image } from "@/lib/r2";
import * as ReactDOM from "react-dom/client";


dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [renameGallery, setRenameGallery] = useState(null);
  const [deleteGallery, setDeleteGallery] = useState(null);
  const [shareGallery, setShareGallery] = useState(null);
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
    <div className="flex flex-1 bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col">
        <DashboardHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} isListView={isListView} setIsListView={setIsListView} />

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
                  <GalleryCard
                    key={gallery.id}
                    gallery={gallery}
                    isListView={isListView}
                    onRename={() => handleRename(gallery)}
                    onShare={() => handleShare(gallery)}
                    onDelete={() => handleDelete(gallery)}
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

      {shareGallery && (
        <Dialog open onOpenChange={() => setShareGallery(null)}>
          <DialogContent>
            <ShareModal
              isOpen={true}
              onClose={() => setShareGallery(null)}
              galleryUrl={`${window.location.origin}/g/${shareGallery.slug}`}
              slug={shareGallery.slug}
              isPublic={shareGallery.isPublic}
              onVisibilityChange={() => {}}
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