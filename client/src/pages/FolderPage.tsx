
import { useRoute } from "wouter";
import { InlineEdit } from "@/components/InlineEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

export function FolderPage() {
  const [match, params] = useRoute("/f/:folderSlug");
  const folderSlug = match ? params.folderSlug : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const updateFolderMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/folders/${folder?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (!res.ok) throw new Error('Failed to update folder name');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["folder", folderSlug]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update folder name",
        variant: "destructive"
      });
    }
  });

  const folderGalleries = galleries.filter(g => g.folderId === folder?.id && !g.deleted_at);

  if (isLoading) {
    return <Layout title="Loading..." />;
  }

  if (!folder) {
    return <Layout title="Folder not found" />;
  }

  return (
    <Layout 
      title={folder.name}
      onTitleChange={async (newName) => {
        updateFolderMutation.mutate(newName);
      }}
    >
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
    </Layout>
  );
}
