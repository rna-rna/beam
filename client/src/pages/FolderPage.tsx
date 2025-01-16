import { useRoute } from "wouter";
import { InlineEdit } from "@/components/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export function FolderPage() {
  const [match, params] = useRoute("/f/:folderSlug");
  const folderSlug = match ? params.folderSlug : null;

  const { data: folder, isLoading } = useQuery({
    queryKey: ["folder", folderSlug],
    queryFn: async () => {
      const res = await fetch(`/api/folders/${folderSlug}`);
      if (!res.ok) throw new Error('Failed to fetch folder');
      return res.json();
    },
    enabled: !!folderSlug,
  });

  const { data: galleries = [] } = useQuery({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const res = await fetch('/api/galleries');
      if (!res.ok) throw new Error('Failed to fetch galleries');
      return res.json();
    }
  });

  const folderGalleries = galleries.filter(g => g.folderId === folder?.id && !g.deleted_at);

  if (isLoading) {
    return (
      <div className="flex h-full">
        <DashboardSidebar />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="animate-pulse">Loading folder...</div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex h-full">
        <DashboardSidebar />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div>Folder not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="p-6">
          {folderGalleries.length === 0 ? (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <div className="text-center text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4" />
                <p>This folder is empty</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {folderGalleries.map(gallery => (
                <Card key={gallery.id} className="overflow-hidden cursor-pointer hover:shadow-lg">
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
          )}
        </div>
      </div>
    </div>
  );
}