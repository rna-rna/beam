
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Grid, Image as ImageIcon, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { formatRelativeDate } from "@/lib/format-date";
import { useQuery } from "@tanstack/react-query";
import type { Gallery } from "@db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export function MainContentV2() {
  const [, setLocation] = useLocation();
  const [selectedGalleries, setSelectedGalleries] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState("created");
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (sortOrder === "lastViewed") return (b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0) - (a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0);
    if (sortOrder === "alphabetical") return a.title.localeCompare(b.title);
    return 0;
  });

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
      <div className="p-6">
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
          <Card className="group hover:shadow-lg transition-all duration-200 bg-muted/50">
            <Button
              variant="ghost"
              className="h-full w-full p-6"
              onClick={() => setLocation("/new")}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium">New Gallery</h3>
                </div>
              </div>
            </Button>
          </Card>

          {sortedGalleries.map((gallery) => {
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
    </DndProvider>
  );
}
