import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { useLocation } from "wouter";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, FolderPlus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainContent() {
  const [, setLocation] = useLocation();
  const [selectedGalleries, setSelectedGalleries] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState("created");
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    }
  });

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const res = await fetch("/api/galleries");
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  const sortedGalleries = [...(galleries || [])].sort((a, b) => {
    if (sortOrder === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortOrder === "lastViewed") {
      const bTime = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
      const aTime = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
      if (bTime === 0 && aTime === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return bTime - aTime;
    }
    if (sortOrder === "alphabetical") return a.title.localeCompare(b.title);
    return 0;
  });

  const displayedGalleries = currentFolder
    ? sortedGalleries.filter((gallery) => gallery.folderId === currentFolder)
    : sortedGalleries;

  const handleFolderClick = (folderId: number | null) => {
    setCurrentFolder(folderId);
  };

  const [{ isOver }, dropRef] = useDrop({
    accept: "GALLERY",
    drop: (item: { id: number }) => {
      if (currentFolder) {
        handleMoveGallery(item.id, currentFolder);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const handleMoveGallery = async (galleryId: number, folderId: number) => {
    try {
      const res = await fetch(`/api/galleries/${galleryId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });

      if (!res.ok) throw new Error('Failed to move gallery');
      await queryClient.invalidateQueries(['/api/galleries']);
    } catch (error) {
      console.error('Failed to move gallery:', error);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading galleries...</div>
        </div>
      );
    }

    return (
      <DndProvider backend={HTML5Backend}>
        <div className="flex h-full">
          <div className="w-64 border-r bg-background/95 p-4">
            <div className="space-y-2">
              <button
                onClick={() => handleFolderClick(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  !currentFolder ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <Clock className="h-4 w-4" />
                <span>All Galleries</span>
              </button>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  ref={dropRef}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer",
                    currentFolder === folder.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    isOver && "ring-2 ring-primary/50 bg-primary/5"
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>{folder.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6">
            <div className="flex justify-end mb-6">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="lastViewed">Last Viewed</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {displayedGalleries.length === 0 ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center text-muted-foreground">
                  <FolderPlus className="w-12 h-12 mx-auto mb-4" />
                  <p>This folder is empty</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedGalleries.map((gallery) => {
                  const [{ isDragging }, dragRef] = useDrag(() => ({
                    type: "GALLERY",
                    item: { id: gallery.id },
                    collect: (monitor) => ({
                      isDragging: monitor.isDragging(),
                    }),
                  }));

                  return (
                    <Card
                      ref={dragRef}
                      key={gallery.id}
                      className={cn(
                        "overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer",
                        isDragging && "opacity-50"
                      )}
                    >
                      <div className="aspect-video relative bg-muted">
                        <img
                          src={gallery.thumbnailUrl || ""}
                          alt={gallery.title}
                          className="object-cover w-full h-full"
                          draggable={false}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold">{gallery.title}</h3>
                        <p className="text-sm text-muted-foreground">{gallery.imageCount} images</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DndProvider>
    );
  };

  return renderContent();
}