
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Grid, Image as ImageIcon, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { formatRelativeDate } from "@/lib/format-date";
import { AnimatePresence, motion } from "framer-motion";
import type { Gallery } from "@db/schema";
import { useQuery } from "@tanstack/react-query";

export function MainContentV2() {
  const [, setLocation] = useLocation();
  
  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const res = await fetch("/api/galleries");
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading galleries...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

        <AnimatePresence>
          {galleries.map((gallery) => (
            <motion.div
              key={gallery.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card 
                className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => setLocation(`/g/${gallery.slug}`)}
              >
                <div className="aspect-square relative bg-muted">
                  {gallery.thumbnailUrl ? (
                    <img
                      src={gallery.thumbnailUrl}
                      alt={gallery.title}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium line-clamp-1 mb-2">{gallery.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Grid className="w-4 h-4" />
                      <span>{gallery.imageCount || 0}</span>
                    </div>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatRelativeDate(gallery.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
