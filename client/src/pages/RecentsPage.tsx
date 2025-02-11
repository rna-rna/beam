
import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Search, ArrowUpDown, List } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { GallerySkeleton } from "@/components/GallerySkeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu } from "lucide-react";

dayjs.extend(relativeTime);

type SortField = 'title' | 'imageCount' | 'lastViewedAt' | 'status';
type SortDirection = 'asc' | 'desc';

export default function RecentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastViewedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: galleries = [], isLoading } = useQuery({
    queryKey: ['/api/recent-galleries'],
    queryFn: async () => {
      const res = await fetch('/api/recent-galleries');
      if (!res.ok) {
        throw new Error('Failed to fetch recent galleries');
      }
      return res.json();
    },
    refetchInterval: 30000
  });

  const sortGalleries = (a: any, b: any) => {
    if (sortField === 'title') {
      return sortDirection === 'asc' 
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }
    if (sortField === 'imageCount') {
      return sortDirection === 'asc' 
        ? (a.imageCount || 0) - (b.imageCount || 0)
        : (b.imageCount || 0) - (a.imageCount || 0);
    }
    if (sortField === 'lastViewedAt') {
      const aTime = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
      const bTime = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    }
    if (sortField === 'status') {
      const aStatus = a.isOwner ? 'owned' : 'shared';
      const bStatus = b.isOwner ? 'owned' : 'shared';
      return sortDirection === 'asc' 
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }
    return 0;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredGalleries = galleries
    .filter(gallery => gallery.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortGalleries);

  const SortableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <Button
      variant="ghost"
      onClick={() => toggleSort(field)}
      className="h-8 px-2 flex items-center gap-1"
    >
      {label}
      <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </Button>
  );

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
        </header>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <GallerySkeleton count={12} />
          ) : filteredGalleries.length > 0 ? (
            <div className="w-full">
              <div className="min-w-full divide-y divide-border">
                <div className="bg-muted/50">
                  <div className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <div>Thumbnail</div>
                    <SortableHeader field="title" label="Title" />
                    <SortableHeader field="imageCount" label="Images" />
                    <SortableHeader field="lastViewedAt" label="Last Viewed" />
                    <SortableHeader field="status" label="Status" />
                  </div>
                </div>
                <div className="divide-y divide-border bg-background">
                  {filteredGalleries.map(gallery => (
                    <div
                      key={gallery.id}
                      className="grid grid-cols-[100px_2fr_1fr_1fr_1fr] gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/g/${gallery.slug}`)}
                    >
                      <div className="w-[80px] h-[80px] bg-muted rounded-md overflow-hidden">
                        {gallery.thumbnailUrl && (
                          <img
                            src={gallery.thumbnailUrl}
                            alt={gallery.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-medium">{gallery.title}</h3>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        {gallery.imageCount || 0} images
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        {gallery.lastViewedAt ? dayjs(gallery.lastViewedAt).fromNow() : 'Never viewed'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={gallery.isOwner ? "default" : "secondary"}>
                          {gallery.isOwner ? 'Owned by you' : 'Shared with you'}
                        </Badge>
                        {!gallery.lastViewedAt && !gallery.isOwner && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            Invited
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <List className="h-12 w-12 text-muted-foreground mb-4" />
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
