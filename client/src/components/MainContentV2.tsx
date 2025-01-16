
import { useQuery } from "@tanstack/react-query";
import type { Gallery } from "@db/schema";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useState, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FolderOpen, FolderPlus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainContentV2() {
  const [, setLocation] = useLocation();
  const [selectedGalleries, setSelectedGalleries] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState("created");
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const res = await fetch("/api/galleries");
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    }
  });

  const sortedGalleries = [...(galleries || [])].sort((a, b) => {
    if (sortOrder === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortOrder === "lastViewed") return (b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0) - (a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0);
    if (sortOrder === "alphabetical") return a.title.localeCompare(b.title);
    return 0;
  });

  const displayedGalleries = currentFolder
    ? sortedGalleries.filter((gallery) => gallery.folderId === currentFolder)
    : sortedGalleries;

  const handleGalleryClick = (gallery: Gallery, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (clickTimerRef.current) {
      // Double click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setLocation(`/g/${gallery.slug}`);
    } else {
      // Set timer for single click
      clickTimerRef.current = setTimeout(() => {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          setSelectedGalleries(prev => 
            prev.includes(gallery.id) ? prev.filter(gid => gid !== gallery.id) : [...prev, gallery.id]
          );
        } else {
          setSelectedGalleries([gallery.id]);
        }
        clickTimerRef.current = null;
      }, 250);
    }
  };

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
              onClick={() => setCurrentFolder(null)}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                !currentFolder ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <Clock className="h-4 w-4" />
              <span>All Galleries</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  currentFolder === folder.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                <span>{folder.name}</span>
              </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* New Gallery Card */}
            <Card className="group hover:shadow-lg transition-all duration-200 bg-muted/50">
              <Button
                variant="ghost"
                className="h-full w-full p-6"
                onClick={() => setLocation("/new")}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FolderPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">New Gallery</h3>
                  </div>
                </div>
              </Button>
            </Card>

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
                  className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${
                    selectedGalleries.includes(gallery.id) 
                      ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20" 
                      : "hover:ring-1 hover:ring-blue-500/20"
                  } ${isDragging ? "opacity-50" : ""}`}
                  onClick={(e) => handleGalleryClick(gallery, e)}
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
        </div>
      </div>
    </DndProvider>
  );
}
