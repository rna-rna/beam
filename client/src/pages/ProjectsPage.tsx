import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Loader2, Image, Plus, AlertTriangle, AlertCircle, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GalleryCardGrid, Gallery } from "@/components/GalleryCardGrid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import mixpanel from 'mixpanel-browser';

const ITEMS_PER_PAGE = 12;

export function ProjectsPage() {
  const { getToken, userId } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();

  // Query for user's galleries
  const { data, isFetching, hasNextPage, fetchNextPage, error, refetch } = useInfiniteQuery({
    queryKey: ["/api/galleries"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      try {
        setFetchError(null);
        console.log('[Projects Page] Fetching page:', pageParam, 'User ID:', userId);
        
        // First, try with Clerk token
        const token = await getToken();
        console.log('[Projects Page] Got auth token:', token ? 'Yes' : 'No');
        
        const requestOptions = {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include' as RequestCredentials, // Important for cookies
        };
        
        console.log('[Projects Page] Request options:', JSON.stringify(requestOptions));
        
        const res = await fetch(`/api/galleries?page=${pageParam}&limit=${ITEMS_PER_PAGE}`, requestOptions);
        
        // Log detailed response info
        console.log('[Projects Page] Response status:', res.status, res.statusText);
        console.log('[Projects Page] Response headers:', {
          'content-type': res.headers.get('content-type'),
          'content-length': res.headers.get('content-length'),
          'cache-control': res.headers.get('cache-control')
        });
        
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          let errorMessage = `Error fetching galleries: ${res.status} ${res.statusText}`;
          
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            console.error('[Projects Page] API error response:', errorData);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            // Handle HTML error responses
            const text = await res.text();
            console.error('[Projects Page] Non-JSON error response:', text.substring(0, 200) + '...');
          }
          
          throw new Error(errorMessage);
        }
        
        // Try to parse the JSON response
        let rawData;
        try {
          rawData = await res.json();
          console.log('[Projects Page] Raw API response:', rawData);
        } catch (e) {
          console.error('[Projects Page] Error parsing JSON response:', e);
          throw new Error('Invalid response from server (not JSON)');
        }
        
        // Check if the response is an array
        if (!Array.isArray(rawData)) {
          console.error('[Projects Page] API returned non-array data:', rawData);
          throw new Error('Invalid galleries data format');
        }
        
        // Format the data to match our Gallery type
        const formattedData = rawData.map((gallery: any) => ({
          id: gallery.id,
          name: gallery.title || gallery.name || 'Untitled',
          slug: gallery.slug,
          imageCount: gallery.imageCount || 0,
          thumbnailUrl: gallery.thumbnailUrl || gallery.ogImageUrl,
          lastViewedAt: gallery.lastViewedAt || gallery.createdAt,
          isPublic: gallery.isPublic || false,
          isFolder: Boolean(gallery.isFolder || gallery.type === 'folder'),
          type: gallery.type || (gallery.isFolder ? 'folder' : 'gallery'),
          createdAt: gallery.createdAt || new Date().toISOString(),
          userId: gallery.userId || userId,
          isOwner: true // User owns all galleries in the projects page
        }));
        
        console.log('[Projects Page] Formatted data:', formattedData);
        return formattedData;
      } catch (error) {
        console.error('[Projects Page] Error fetching galleries:', error);
        const message = error instanceof Error ? error.message : 'Unknown error fetching galleries';
        setFetchError(message);
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const hasNext = lastPage.length === ITEMS_PER_PAGE;
      console.log('[Projects Page] Last page length:', lastPage.length);
      console.log('[Projects Page] Has next page:', hasNext);
      return hasNext ? allPages.length + 1 : undefined;
    },
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch when window is focused
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        console.log('[Projects Page] Intersection observer triggered:', {
          isIntersecting: entries[0].isIntersecting,
          hasNextPage,
          isFetching
        });
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

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  useEffect(() => {
    // Update document title if it exists
    document.title = "Drafts | Gallerypt";
  }, []);

  // Alternative fetch method for debugging
  const fetchGalleriesDirectly = async () => {
    try {
      setFetchError(null);
      
      // Try with cookies only
      const response = await fetch('/api/galleries', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('[Direct Fetch] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Direct Fetch] Galleries:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        // This proves we can get the data, so trigger a refetch of the query
        refetch();
      } else {
        console.log('[Direct Fetch] No galleries found or invalid response format');
      }
    } catch (error) {
      console.error('[Direct Fetch] Error:', error);
      setFetchError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const galleries = (data?.pages ?? []).flat() as Gallery[];
  
  console.log('[Projects Page] All galleries:', galleries);
  
  const filteredGalleries = galleries.filter((gallery: Gallery) => 
    (gallery?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );
  
  console.log('[Projects Page] Filtered galleries:', filteredGalleries);

  const handleNavigate = (slug: string) => {
    // Track gallery opened event in Mixpanel
    const gallery = galleries.find((g: Gallery) => g.slug === slug);
    if (gallery) {
      mixpanel.track('Gallery Opened', {
        gallery_id: gallery.id,
        gallery_name: gallery.name,
        source_page: 'drafts',
        gallery_type: gallery.type || 'gallery'
      });
    }
    
    setLocation(`/g/${slug}`);
  };

  const handleSelectionChange = (newSelectedIds: Set<number>) => {
    setSelectedIds(newSelectedIds);
  };
  
  // Handle moving items between folders
  const handleItemMoved = async (galleryIds: number[], targetFolderId: number) => {
    try {
      // Find the target folder
      const targetFolder = galleries.find(g => g.id === targetFolderId && g.isFolder);
      if (!targetFolder) {
        throw new Error('Target folder not found');
      }

      console.log('[Moving galleries from Drafts]', { 
        galleryIds, 
        targetFolderId, 
        targetFolderSlug: targetFolder.slug 
      });

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

      const moveResult = await response.json();
      console.log('[Move success]', moveResult);

      // Track the move event in Mixpanel
      mixpanel.track('Items Added to Folder', {
        folder_name: targetFolder.name,
        folder_id: targetFolder.id,
        gallery_ids: galleryIds,
        item_count: galleryIds.length,
        source: 'drafts_page'
      });

      // Invalidate all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['folder', targetFolder.slug] }),
        queryClient.invalidateQueries({ queryKey: ['folder-galleries', targetFolder.slug] }),
        queryClient.invalidateQueries({ queryKey: ['folders'] })
      ]);

      // Force an immediate refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ['/api/galleries'] });
      
      // Remove items from local state to avoid UI flicker while refetching
      const movedIds = new Set(galleryIds);
      
      // Reset selection if any selected items were moved
      if (Array.from(selectedIds).some(id => movedIds.has(id))) {
        setSelectedIds(new Set());
      }
      
    } catch (error) {
      console.error('[Move Error]', error);
      // TODO: Add error toast here
    }
  };

  return (
    <DashboardLayout>
      <ScrollArea className="flex-1">
        <DashboardHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isListView={isListView}
          setIsListView={setIsListView}
          searchPlaceholder="Search drafts..."
        />
        
        {isFetching && galleries.length === 0 ? (
          <div className="flex items-center justify-center h-64 mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <div className="p-4">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load drafts. {fetchError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : galleries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p>No drafts yet</p>
              <Button 
                onClick={() => setLocation('/new')} 
                variant="outline" 
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Create New Draft
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3">
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
            {hasNextPage && (
              <div 
                ref={loadMoreRef} 
                className="w-full py-8 flex items-center justify-center"
              >
                {isFetching && (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </DashboardLayout>
  );
}

// Default export
export default ProjectsPage;