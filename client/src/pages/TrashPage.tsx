
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { getR2Image } from "@/lib/r2";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);

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
    <div className="flex flex-1 bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col">
        <DashboardHeader
          searchQuery={""}
          setSearchQuery={() => {}}
          isListView={false}
          setIsListView={() => {}}
          searchPlaceholder="Search trash..."
          showNewGalleryButton={false}
        />
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Trash</h2>
        {trashedGalleries.length === 0 ? (
          <div className="text-muted-foreground">No items in trash.</div>
        ) : (
          <div className={isListView ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {trashedGalleries
              .filter((gallery: any) => gallery.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((gallery: any) => (
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
      </div>
      </main>
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { API_URL } from "@/lib/constants";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GalleryCard } from "@/components/GalleryCard";

interface Gallery {
  id: number;
  slug: string;
  title: string;
  description?: string;
  userId: string;
  imageCount: number;
  thumbnailUrl?: string;
  isOwner: boolean;
  deletedAt: string;
}

function TrashPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isListView, setIsListView] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);

  const { data: trashedGalleries = [], isLoading } = useQuery<Gallery[]>({
    queryKey: ["trashedGalleries"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/galleries/trash`);
      return response.json();
    },
  });

  const filteredGalleries = trashedGalleries.filter((gallery) => {
    return gallery.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleRestore = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setIsRestoreModalOpen(true);
  };

  const handlePermanentDelete = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setIsPermanentDeleteModalOpen(true);
  };

  return (
    <DashboardLayout
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isListView={isListView}
      setIsListView={setIsListView}
      searchPlaceholder="Search trash..."
      showNewGalleryButton={false}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center">
          <h2 className="text-xl font-semibold">Trash is empty</h2>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term" : "No deleted galleries found"}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isListView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {filteredGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              isListView={isListView}
              onRestore={handleRestore}
              onDelete={handlePermanentDelete}
              isTrash={true}
            />
          ))}
        </div>
      )}

      {/* Restore Modal */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent>
          <div className="p-4">
            <h2 className="text-lg font-semibold">Restore Gallery</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to restore "{selectedGallery?.title}"?
            </p>
            {/* Add restore functionality here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Modal */}
      <Dialog open={isPermanentDeleteModalOpen} onOpenChange={setIsPermanentDeleteModalOpen}>
        <DialogContent>
          <div className="p-4">
            <h2 className="text-lg font-semibold">Permanently Delete Gallery</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. Are you sure you want to permanently delete "{selectedGallery?.title}"?
            </p>
            {/* Add permanent delete functionality here */}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
