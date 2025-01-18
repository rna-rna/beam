
import { useQuery } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function DraftsPage() {
  const [, setLocation] = useLocation();

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['galleries'],
    queryFn: async () => {
      const res = await fetch('/api/galleries');
      if (!res.ok) {
        throw new Error('Failed to fetch galleries');
      }
      const data = await res.json();
      return data;
    },
    refetchOnMount: true,
    staleTime: 0
  });

  const draftGalleries = galleries.filter(gallery => gallery.is_draft === true && !gallery.deleted_at);

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {draftGalleries.map(gallery => (
              <Card 
                key={gallery.id} 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
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
                  <p className="text-sm text-muted-foreground">
                    {gallery.imageCount || 0} images
                  </p>
                </div>
              </Card>
            ))}
            {draftGalleries.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">
                No draft galleries found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
