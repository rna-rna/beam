
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { getR2Image } from "@/lib/r2";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trashedGalleries = [], isLoading } = useQuery({
    queryKey: ["/api/trash"],
    queryFn: async () => {
      const res = await fetch("/api/trash");
      if (!res.ok) throw new Error("Failed to fetch trash");
      return res.json();
    },
  });

  async function handleRestore(slug: string) {
    try {
      const res = await fetch(`/api/galleries/${slug}/restore`, { 
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore");
      
      queryClient.invalidateQueries(["/api/trash"]);
      queryClient.invalidateQueries(["/api/recent-galleries"]);
      
      toast({
        title: "Gallery Restored",
        description: "The gallery has been restored successfully."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to restore gallery",
        variant: "destructive"
      });
    }
  }

  async function handlePermanentDelete(slug: string) {
    try {
      const res = await fetch(`/api/galleries/${slug}/permanent-delete`, { 
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to permanently delete");
      
      queryClient.invalidateQueries(["/api/trash"]);
      
      toast({
        title: "Gallery Deleted",
        description: "The gallery has been permanently deleted."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to permanently delete gallery",
        variant: "destructive"
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="animate-spin w-6 h-6" />
        <span className="ml-2">Loading Trash...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0 p-4">
        <h2 className="text-xl font-bold mb-4">Trash</h2>
        {trashedGalleries.length === 0 ? (
          <div className="text-muted-foreground">No items in trash.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trashedGalleries.map((gallery: any) => (
              <Card key={gallery.id} className="p-4 space-y-2">
                <div className="w-full h-40 bg-muted rounded-md overflow-hidden">
                  {gallery.images?.[0] ? (
                    <img
                      src={getR2Image(gallery.images[0], "thumb")}
                      alt={gallery.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Trash2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold">{gallery.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {gallery.imageCount} images
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRestore(gallery.slug)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handlePermanentDelete(gallery.slug)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Forever
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
