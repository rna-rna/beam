import { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, ChevronDown, Menu, Image, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog"; // Added import

export default function Dashboard() {
  const { getToken } = useAuth();
  const [sortOrder, setSortOrder] = useState('created');

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/galleries'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch galleries');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      {/* Sidebar for larger screens */}
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>

      {/* Main content */}
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
            <Button onClick={() => window.location.href = '/new'}>
              <Plus className="mr-2 h-4 w-4" /> New Gallery
            </Button>
          </div>
        </header>
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleries.map((gallery) => (
              <ContextMenu key={gallery.id}>
                <ContextMenuTrigger>
                  <div 
                    className="border rounded-lg overflow-hidden cursor-pointer"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'gallery',
                        id: gallery.id,
                        title: gallery.title
                      }));
                    }}
                  >
                    {gallery.thumbnailUrl ? (
                      <img 
                        src={gallery.thumbnailUrl} 
                        alt={gallery.title} 
                        className="w-full h-40 object-cover" 
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center">
                        <Image className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold">{gallery.title}</h3>
                      <p className="text-sm text-muted-foreground">{gallery.imageCount || 0} images</p>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => window.location.href = `/g/${gallery.slug}`}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => {
                    const url = `${window.location.origin}/g/${gallery.slug}`;
                    const modal = document.createElement('div');
                    modal.id = `share-modal-${gallery.id}`;
                    document.body.appendChild(modal);
                    const root = ReactDOM.createRoot(modal);
                    root.render(
                      <Dialog open onOpenChange={() => {
                        root.unmount();
                        modal.remove();
                      }}>
                        <DialogContent>
                          <ShareModal 
                            galleryUrl={url}
                            slug={gallery.slug}
                            isPublic={gallery.isPublic}
                            onClose={() => {
                              root.unmount();
                              modal.remove();
                            }}
                            onVisibilityChange={() => {}}
                          />
                        </DialogContent>
                      </Dialog>
                    );
                  }}>
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => {/* Add rename handler */}}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-red-600" onSelect={() => {
                    const dialog = document.createElement('dialog');
                    dialog.innerHTML = `
                      <div class="fixed inset-0 bg-background/80 backdrop-blur-sm">
                        <div class="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
                          <DeleteGalleryModal
                            isOpen={true}
                            onClose={() => dialog.close()}
                            gallerySlug={gallery.slug}
                            galleryTitle={gallery.title}
                          />
                        </div>
                      </div>
                    `;
                    document.body.appendChild(dialog);
                    dialog.showModal();
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}