import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, FolderOpen, Image, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Gallery {
  id: number;
  title: string;
  slug: string;
  folderId: number;
  thumbnailUrl?: string;
  imageCount?: number;
  deleted_at?: string | null;
}

interface Folder {
  id: number;
  name: string;
  slug: string;
}

export function FolderPage() {
  const [match, params] = useRoute("/f/:folderSlug");
  const [, setLocation] = useLocation();
  const folderSlug = match ? params.folderSlug : null;
  const [sortOrder, setSortOrder] = useState<'created' | 'viewed' | 'alphabetical'>('created');
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch folder data
  const { data: folder, isLoading: isFolderLoading } = useQuery<Folder>({
    queryKey: ["folder", folderSlug],
    queryFn: async () => {
      const res = await fetch(`/api/folders/${folderSlug}`);
      if (!res.ok) throw new Error('Failed to fetch folder');
      return res.json();
    },
    enabled: !!folderSlug,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch all galleries once
  const { data: galleries = [], isLoading: isGalleriesLoading } = useQuery<Gallery[]>({
    queryKey: ["galleries"],
    queryFn: async () => {
      const res = await fetch('/api/galleries');
      if (!res.ok) throw new Error('Failed to fetch galleries');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Filter galleries for current folder using memo
  const folderGalleries = useMemo(() => {
    if (!folder || !galleries.length) return [];
    return galleries.filter(g => {
      const matchesSearch = !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase());
      return g.folderId === folder.id && !g.deleted_at && matchesSearch;
    });
  }, [folder, galleries, searchQuery]);

  const isLoading = isFolderLoading || isGalleriesLoading;

  if (!folderSlug) {
    return null;
  }

  if (isLoading || !folder) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const content = (
    <ScrollArea className="flex-1 p-4">
      <div className="flex items-center justify-between mb-4">
        <Input
          type="search"
          placeholder="Search galleries..."
          className="w-64"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Sort by <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setSortOrder('created')}>
              Created Date
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortOrder('viewed')}>
              Last Viewed
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortOrder('alphabetical')}>
              Alphabetical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folderGalleries.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4" />
              <p>This folder is empty</p>
            </div>
          </div>
        ) : (
          folderGalleries.map(gallery => (
            <Card 
              key={gallery.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/g/${gallery.slug}`)}
            >
              <div className="aspect-video relative bg-muted">
                {gallery.thumbnailUrl ? (
                  <img
                    src={gallery.thumbnailUrl}
                    alt={gallery.title}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{gallery.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {gallery.imageCount || 0} images
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}
