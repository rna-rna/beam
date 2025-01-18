import { useState, useEffect } from "react";
import * as ReactDOM from "react-dom/client";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ChevronDown,
  Menu,
  Image,
  FolderOpen,
  Share,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { GallerySkeleton } from "@/components/GallerySkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { getR2Image } from "@/lib/r2";

export default function Dashboard() {
  const { getToken } = useAuth();
  const [sortOrder, setSortOrder] = useState("created");
  const [selectedGalleries, setSelectedGalleries] = useState<number[]>([]);

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/galleries", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedGalleries.length > 0) {
        const gallery = galleries.find((g) => g.id === selectedGalleries[0]);
        if (gallery) {
          const modal = document.createElement("dialog");
          modal.innerHTML = `
            <div class="fixed inset-0 bg-background/80 backdrop-blur-sm">
              <div class="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
                <DeleteGalleryModal
                  isOpen={true}
                  onClose={() => modal.close()}
                  gallerySlug={gallery.slug}
                  galleryTitle={gallery.title}
                />
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          modal.showModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGalleries, galleries]);

  const MainContent = () => {
    if (isLoading) {
      return <GallerySkeleton count={12} />;
    }

    if (galleries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">No galleries found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first gallery to get started
          </p>
          <Button onClick={() => (window.location.href = "/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Gallery
          </Button>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {galleries.map((gallery) => (
          <ContextMenu key={gallery.id}>
            <ContextMenuTrigger>
              <div
                className={`border rounded-lg overflow-hidden cursor-pointer ${selectedGalleries.includes(gallery.id) ? "ring-2 ring-primary" : ""}`}
                draggable
                onClick={(e) => {
                  if (e.shiftKey) {
                    const lastSelected =
                      selectedGalleries[selectedGalleries.length - 1];
                    const currentIndex = galleries.findIndex(
                      (g) => g.id === gallery.id,
                    );
                    const lastIndex = galleries.findIndex(
                      (g) => g.id === lastSelected,
                    );
                    if (lastIndex !== -1) {
                      const start = Math.min(currentIndex, lastIndex);
                      const end = Math.max(currentIndex, lastIndex);
                      const range = galleries
                        .slice(start, end + 1)
                        .map((g) => g.id);
                      setSelectedGalleries(range);
                    } else {
                      setSelectedGalleries([gallery.id]);
                    }
                  } else if (!e.metaKey && !e.ctrlKey) {
                    setSelectedGalleries([gallery.id]);
                  }
                }}
                onDoubleClick={() =>
                  (window.location.href = `/g/${gallery.slug}`)
                }
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({
                      type: "gallery",
                      id: gallery.id,
                      title: gallery.title,
                    }),
                  );
                }}
              >
                {gallery.thumbnailUrl ? (
                  <img
                    src={
                      gallery.images?.[0]
                        ? getR2Image(gallery.images[0], "thumb")
                        : "/fallback-image.jpg"
                    }
                    alt={gallery.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{gallery.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {gallery.imageCount || 0} images
                  </p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() => (window.location.href = `/g/${gallery.slug}`)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  const url = `${window.location.origin}/g/${gallery.slug}`;
                  const modal = document.createElement("div");
                  modal.id = `share-modal-${gallery.id}`;
                  document.body.appendChild(modal);
                  const root = ReactDOM.createRoot(modal);
                  root.render(
                    <Dialog
                      open
                      onOpenChange={() => {
                        root.unmount();
                        modal.remove();
                      }}
                    >
                      <DialogContent>
                        <ShareModal
                          galleryUrl={url}
                          slug={gallery.slug}
                          isPublic={gallery.isPublic}
                          onClose={() => {
                            root.unmount();
                            modal.remove();
                          }}
                          onVisibilityChange={() => {}}
                        />
                      </DialogContent>
                    </Dialog>,
                  );
                }}
              >
                <Share className="mr-2 h-4 w-4" />
                Share
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  /* Add rename handler */
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-red-600"
                onSelect={() => {
                  const dialog = document.createElement("dialog");
                  dialog.innerHTML = `
                  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm">
                    <div class="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
                      <DeleteGalleryModal
                        isOpen={true}
                        onClose={() => dialog.close()}
                        gallerySlug={gallery.slug}
                        galleryTitle={gallery.title}
                      />
                    </div>
                  </div>
                `;
                  document.body.appendChild(dialog);
                  dialog.showModal();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
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
            <Input
              type="search"
              placeholder="Search galleries..."
              className="ml-2 w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort by <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSortOrder("created")}>
                  Created Date
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("viewed")}>
                  Last Viewed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("alphabetical")}>
                  Alphabetical
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => (window.location.href = "/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Gallery
            </Button>
          </div>
        </header>
        <ScrollArea className="flex-1 p-4">
          <MainContent />
        </ScrollArea>
      </main>
    </div>
  );
}
