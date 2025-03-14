import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIntersection } from '@mantine/hooks';
import { Button } from '@/components/ui/button';
import { Image, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const loadMoreRef = useRef(null);

  const { data: galleries = [], isFetching, hasNextPage, fetchNextPage } = useQuery({
    queryKey: ['/api/galleries'],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch galleries');
      return res.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === ITEMS_PER_PAGE ? pages.length + 1 : undefined;
    },
    keepPreviousData: true,
  });

  const { ref, entry } = useIntersection({
    root: null,
    threshold: 0.5,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, hasNextPage, isFetching, fetchNextPage]);

  const allGalleries = galleries.flat();
  const filteredGalleries = allGalleries.filter(gallery =>
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollArea className="flex-1 p-4">
      {filteredGalleries.length === 0 && !isFetching ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">Create your first project to get started</p>
          <Button onClick={() => (window.location.href = "/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Gallery
          </Button>
        </div>
      ) : (
        <>
          <div className={isListView ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {filteredGalleries.map(gallery => (
              <ContextMenu key={gallery.id}>
                <ContextMenuTrigger>
                  <Card
                    className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:bg-muted/50 ${isListView ? 'flex' : ''}`}
                    onClick={(e) => {
                      if (e.button === 2) return;
                      window.location.href = `/g/${gallery.slug}`;
                    }}
                  >
                    <div className={`${isListView ? 'w-24 h-24 shrink-0' : 'aspect-video'} relative bg-muted`}>
                      {gallery.thumbnailUrl && (
                        <img
                          src={gallery.thumbnailUrl}
                          alt={gallery.title}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{gallery.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {gallery.imageCount || 0} images
                      </p>
                    </div>
                  </Card>
                </ContextMenuTrigger>
              </ContextMenu>
            ))}
          </div>
          {hasNextPage && (
            <div ref={ref} className="w-full h-20 flex items-center justify-center">
              {isFetching ? 'Loading more...' : ''}
            </div>
          )}
        </>
      )}
    </ScrollArea>
  );
}