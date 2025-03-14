import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute } from "wouter";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FolderOpen, Image, Loader2, Menu, Filter } from "lucide-react";

export function MainContent() {
  const [match, params] = useRoute("/f/:folderSlug");
  const folderSlug = match ? params.folderSlug : null;
  const [sortOrder, setSortOrder] = useState("created");

  const { data: folder, isLoading: isFolderLoading } = useQuery({
    queryKey: ["folder", folderSlug],
    queryFn: async () => {
      const res = await fetch(`/api/folders/${folderSlug}`);
      if (!res.ok) throw new Error("Failed to fetch folder");
      return res.json();
    },
    enabled: !!folderSlug,
  });

  const { data: galleries = [], isLoading: isGalleriesLoading } = useQuery({
    queryKey: ["/api/galleries"],
    queryFn: async () => {
      const res = await fetch("/api/galleries");
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  const folderGalleries = galleries.filter(
    (g) => g.folderId === folder?.id && !g.deleted_at
  );
  const isLoading = isFolderLoading || isGalleriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-screen bg-background overflow-hidden">
      <aside className="hidden md:block w-64 border-r h-screen">
        <DashboardSidebar />
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <DashboardSidebar />
              </SheetContent>
            </Sheet>
            <Input
              type="search"
              placeholder="Search galleries..."
              className="ml-2 w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort by <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSortOrder("created")}>
                  Created Date
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("viewed")}>
                  Last Viewed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("alphabetical")}>
                  Alphabetical
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folderGalleries.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4" />
                  <p>This folder is empty</p>
                </div>
              </div>
            ) : (
              folderGalleries.map((gallery) => (
                <Card
                  key={gallery.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => (window.location.href = `/g/${gallery.slug}`)}
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
      </div>
    </div>
  );
}