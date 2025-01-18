
import { useState } from 'react';
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, ChevronDown, Menu } from "lucide-react";
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
              <div key={gallery.id} className="border rounded-lg overflow-hidden">
                <img 
                  src={gallery.thumbnailUrl || "/placeholder.svg"} 
                  alt={gallery.title} 
                  className="w-full h-40 object-cover" 
                />
                <div className="p-4">
                  <h3 className="font-semibold">{gallery.title}</h3>
                  <p className="text-sm text-muted-foreground">{gallery.imageCount || 0} images</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
