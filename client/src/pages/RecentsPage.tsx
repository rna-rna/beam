
import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Search, Clock, Plus, List } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { GallerySkeleton } from "@/components/GallerySkeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

export default function RecentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/recent-galleries'],
    queryFn: async () => {
      const res = await fetch('/api/recent-galleries');
      if (!res.ok) {
        throw new Error('Failed to fetch recent galleries');
      }
      return res.json();
    },
    refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
  });

  const filteredGalleries = galleries.filter(gallery => {
    return gallery.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      <aside className="hidden md:block w-64 border-r">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
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
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recent galleries..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setLocation("/new")}>
              <Plus className="mr-2 h-4 w-4" /> New Gallery
            </Button>
            <Toggle
              pressed={isListView}
              onPressedChange={setIsListView}
              aria-label="Toggle list view"
            >
              <List className="h-4 w-4" />
            </Toggle>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <GallerySkeleton count={12} />
          ) : filteredGalleries.length > 0 ? (
            <div className={isListView ? "flex flex-col gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
              {filteredGalleries.map(gallery => (
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
                  <div className={`p-4 ${isListView ? 'flex items-center justify-between w-full' : ''}`}>
                    <div>
                      <h3 className="font-semibold">{gallery.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {gallery.imageCount || 0} images
                      </p>
                    </div>
                    <div className={`${isListView ? 'flex items-center gap-8' : 'flex items-center justify-between mt-2'} text-xs text-muted-foreground`}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {gallery.lastViewedAt ? dayjs(gallery.lastViewedAt).fromNow() : 'Never viewed'}
                      </div>
                      <span>
                        {gallery.isOwner ? 'Owned by you' : `Shared by ${gallery.sharedBy?.firstName || ''} ${gallery.sharedBy?.lastName || ''}`}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No recent galleries found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search or filters' : "You haven't viewed any galleries yet"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
