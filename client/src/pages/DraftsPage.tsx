
import { useQuery } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function DraftsPage() {
  const [, setLocation] = useLocation();

  const { data: galleries = [], isLoading, error } = useQuery({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const res = await fetch('/api/galleries');
      if (!res.ok) throw new Error('Failed to fetch galleries');
      const data = await res.json();
      return data;
    },
    staleTime: 0,
    refetchOnMount: true
  });

  const draftGalleries = galleries.filter(g => g.is_draft && !g.deleted_at);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <DashboardSidebar />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {draftGalleries.map(gallery => (
            <Card 
              key={gallery.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg"
              onClick={() => setLocation(`/g/${gallery.slug}`)}
            >
              <div className="aspect-video relative bg-muted">
                {gallery.thumbnailUrl && (
                  <img
                    src={gallery.thumbnailUrl}
                    alt={gallery.title}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{gallery.title}</h3>
                <p className="text-sm text-muted-foreground">{gallery.imageCount} images</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
