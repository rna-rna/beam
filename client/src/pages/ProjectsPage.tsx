import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { ListViewIcon, GridViewIcon } from '@/assets/icons';
import { useIntersection } from '@mantine/hooks';
import { useAuth } from '@clerk/clerk-react';
import GalleryCard from '@/components/GalleryCard';
import GalleryListItem from '@/components/GalleryListItem';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [renameGallery, setRenameGallery] = useState(null);
  const [deleteGallery, setDeleteGallery] = useState(null);
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();

  const { 
    data: galleryPages = [], 
    isFetching, 
    hasNextPage, 
    fetchNextPage 
  } = useQuery({
    queryKey: ["/api/galleries", page],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();
      const res = await fetch(`/api/galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch galleries");
      return res.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === ITEMS_PER_PAGE ? pages.length + 1 : undefined;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { 
        threshold: 0,
        rootMargin: '100px'
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  const galleries = galleryPages.flat();
  const filteredGalleries = galleries.filter(gallery => 
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:block w-64 border-r relative">
        <div className="h-full flex flex-col">
          <DashboardSidebar />
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-y-auto">
        <DashboardHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          setIsListView={setIsListView} 
          isListView={isListView}
        />
        <ScrollArea className="flex-1 p-6">
          {filteredGalleries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects found</p>
            </div>
          ) : (
            <>
              {isListView ? (
                <div className="space-y-2">
                  {filteredGalleries.map((gallery) => (
                    <GalleryListItem
                      key={gallery.id}
                      gallery={gallery}
                      setRenameGallery={setRenameGallery}
                      setDeleteGallery={setDeleteGallery}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGalleries.map((gallery) => (
                    <GalleryCard
                      key={gallery.id}
                      gallery={gallery}
                      setRenameGallery={setRenameGallery}
                      setDeleteGallery={setDeleteGallery}
                    />
                  ))}
                </div>
              )}
              {(hasNextPage || isFetching) && (
                <div
                  ref={loadMoreRef}
                  className="w-full flex justify-center items-center my-8"
                  style={{ minHeight: '100px' }}
                >
                  {isFetching ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    // Spacer for intersection observer
                    <div className="h-4" />
                  )}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}