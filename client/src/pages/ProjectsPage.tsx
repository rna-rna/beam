
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Image, Menu, Plus } from "lucide-react";
import { getR2Image } from "@/lib/r2";

export default function ProjectsPage() {
  const { getToken } = useAuth();

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ["/api/galleries/my"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/galleries/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
  });

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
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
              placeholder="Search projects..."
              className="ml-2 w-64"
            />
          </div>
          <Button onClick={() => (window.location.href = "/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </header>
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleries.map((gallery) => (
              <Card
                key={gallery.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => (window.location.href = `/g/${gallery.slug}`)}
              >
                <div className="aspect-video relative bg-muted">
                  {gallery.thumbnailUrl ? (
                    <img
                      src={gallery.images?.[0] ? getR2Image(gallery.images[0], "thumb") : "/fallback-image.jpg"}
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
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
