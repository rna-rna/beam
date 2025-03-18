import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Clock, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GallerySkeleton } from "@/components/GallerySkeleton";
import { GalleryCardGrid, Gallery } from "@/components/GalleryCardGrid";
import mixpanel from 'mixpanel-browser';

const ITEMS_PER_PAGE = 24;

export default function RecentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();

  // Query for recent galleries and folders
  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['/api/recent-galleries'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      console.log(`[RecentsPage] Fetching page ${pageParam} with limit ${ITEMS_PER_PAGE}`);
      const url = `/api/recent-galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`;
      
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        console.error(`[RecentsPage] API error:`, {
          status: res.status,
          statusText: res.statusText
        });
        throw new Error(`Failed to fetch recent galleries: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log(`[RecentsPage] Received ${data.length} items for page ${pageParam}`);
      
      return data.map((gallery: any) => ({
        ...gallery,
        name: gallery.title || gallery.name,
        isFolder: Boolean(gallery.isFolder || gallery.type === 'folder'),
        type: gallery.type || (gallery.isFolder ? 'folder' : 'gallery'),
        lastViewedAt: gallery.lastViewedAt || gallery.createdAt
      }));
    },
    getNextPageParam: (lastPage, allPages) => {
      const hasNext = lastPage.length === ITEMS_PER_PAGE;
      const nextPage = hasNext ? allPages.length + 1 : undefined;
      console.log(`[RecentsPage] Next page determination:`, {
        lastPageSize: lastPage.length,
        expectedSize: ITEMS_PER_PAGE,
        hasNext,
        nextPage,
        currentPageCount: allPages.length
      });
      return nextPage;
    },
  });

  // Flatten all pages of data into a single array of galleries
  const galleries = (data?.pages ?? []).flat();
  const filteredGalleries = galleries.filter((gallery: Gallery) => 
    (gallery?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  console.log('[RecentsPage] Gallery Data:', {
    totalItems: galleries.length,
    filteredItems: filteredGalleries.length,
    pageCount: data?.pages?.length || 0,
    hasNextPage,
    isFetching
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          console.log('[RecentsPage] Loading more items', {
            hasNextPage,
            isFetching
          });
          fetchNextPage();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Increased from 100px to trigger earlier
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.disconnect();
      }
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  const handleNavigate = (slug: string) => {
    // Track gallery opened event in Mixpanel
    const gallery = galleries.find((g: Gallery) => g.slug === slug);
    if (gallery) {
      mixpanel.track('Gallery Opened', {
        gallery_id: gallery.id,
        gallery_name: gallery.name,
        source_page: 'recents',
        gallery_type: gallery.type || 'gallery'
      });
    }
    
    setLocation(`/g/${slug}`);
  };

  const handleSelectionChange = (newSelectedIds: Set<number>) => {
    setSelectedIds(newSelectedIds);
  };

  const handleItemMoved = async (galleryIds: number[], targetFolderId: number) => {
    try {
      // Find the target folder
      const targetFolder = galleries.find(g => g.id === targetFolderId && g.isFolder);
      if (!targetFolder) {
        throw new Error('Target folder not found');
      }

      // Make API call to move galleries to folder
      const response = await fetch(`/api/galleries/${targetFolder.slug}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          galleryIds,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const htmlText = await response.text();
          console.error('[Move Error] Received HTML instead of JSON:', htmlText.substring(0, 100) + '...');
          throw new Error('Received HTML response instead of JSON');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to move galleries');
      }

      // Track the move event in Mixpanel
      mixpanel.track('Items Added to Folder', {
        folder_name: targetFolder.name,
        folder_id: targetFolder.id,
        gallery_ids: galleryIds,
        item_count: galleryIds.length,
        source: 'recents_page'
      });

      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['folder', targetFolder.slug] }),
        queryClient.invalidateQueries({ queryKey: ['folder-galleries', targetFolder.slug] })
      ]);

      // Refetch the current page to update the UI immediately
      await queryClient.refetchQueries({ queryKey: ['/api/recent-galleries'] });
    } catch (error) {
      console.error('[Move Error]', error);
      // TODO: Add error toast here
    }
  };

  const createNewFolder = async () => {
    try {
      console.log('[Creating New Folder]');
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: 'New Folder',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Create Folder Error]', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'Failed to create folder');
      }

      const newFolder = await response.json();
      console.log('[New Folder Created]', newFolder);

      // Track folder creation in Mixpanel
      mixpanel.track('Folder Created', {
        folder_name: 'New Folder',
        folder_id: newFolder.id,
        source: 'recents_page'
      });

      // Only invalidate and refetch the recent-galleries query
      await queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
      await queryClient.refetchQueries({ queryKey: ['/api/recent-galleries'] });
    } catch (error) {
      console.error('[Create Folder Error]', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="sticky top-0 z-10 bg-background">
        <DashboardHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isListView={isListView} 
          setIsListView={setIsListView}
          selectedCount={selectedIds.size}
        >
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={createNewFolder}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </DashboardHeader>
      </div>

      <ScrollArea className="flex-1">
        {isFetching && galleries.length === 0 ? (
          <div className="p-2 md:p-4">
            <GallerySkeleton count={ITEMS_PER_PAGE} />
          </div>
        ) : filteredGalleries.length > 0 ? (
          <div className="p-2 md:p-3 overflow-x-hidden">
            <GalleryCardGrid 
              galleries={filteredGalleries}
              isListView={isListView}
              selectable={true}
              draggable={true}
              onNavigate={handleNavigate}
              onSelectionChange={handleSelectionChange}
              onItemMoved={handleItemMoved}
            />
            
            {/* Infinite scroll loading trigger */}
            <div 
              ref={loadMoreRef} 
              className="w-full py-8 flex items-center justify-center"
            >
              {isFetching && (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
            </div>
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
      </ScrollArea>
    </DashboardLayout>
  );
}