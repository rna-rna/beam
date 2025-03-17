import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, FolderOpen, Image, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GalleryCardGrid, Gallery } from "@/components/GalleryCardGrid";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Folder {
  id: number;
  name: string;
  slug: string;
}

export function FolderPage() {
  const [match, params] = useRoute("/f/:folderSlug");
  const [, setLocation] = useLocation();
  const folderSlug = match ? params.folderSlug : null;
  const [sortOrder, setSortOrder] = useState<'created' | 'viewed' | 'alphabetical'>('created');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  // Fetch folder data
  const { data: folder, isLoading: isFolderLoading } = useQuery<Folder>({
    queryKey: ['folder', folderSlug],
    queryFn: async () => {
      console.log('[Fetching Folder]', { folderSlug });
      const res = await fetch(`/api/folders/${folderSlug}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch folder');
      const data = await res.json();
      console.log('[Folder Data]', data);
      return data;
    },
    enabled: !!folderSlug,
    staleTime: 0
  });

  // Fetch folder's galleries
  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: ['folder-galleries', folderSlug],
    queryFn: async () => {
      if (!folder) return [];
      
      console.log('[Fetching Folder Galleries]', { folderId: folder.id });
      
      // Use the dedicated endpoint for folder galleries
      const res = await fetch(`/api/folders/${folder.id}/galleries`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        console.error('[Folder Galleries Error]', {
          status: res.status,
          statusText: res.statusText
        });
        
        // Try to get more detailed error information
        try {
          const errorText = await res.text();
          console.error('[Folder Galleries Error Details]', errorText);
        } catch (e) {
          console.error('[Failed to get error details]', e);
        }
        
        return [];
      }
      
      const data = await res.json();
      console.log('[Folder Galleries Data]', data);
      
      // Check if thumbnails are included in the response
      const hasMissingThumbnails = data.some((gallery: any) => 
        !gallery.thumbnailUrl && !gallery.ogImageUrl
      );
      
      if (hasMissingThumbnails) {
        console.warn('[Missing Thumbnails]', 
          'Some galleries are missing thumbnails in the API response'
        );
      }
      
      // Format the data to match our Gallery type
      return data.map((gallery: any) => ({
        id: gallery.id,
        name: gallery.title || gallery.name || 'Untitled',
        isFolder: false, // These are all galleries, not folders
        lastViewedAt: gallery.lastViewedAt || gallery.createdAt,
        thumbnailUrl: gallery.thumbnailUrl || gallery.ogImageUrl || null,
        isOwner: true, // Galleries in a folder are owned by the user
        slug: gallery.slug,
        createdAt: gallery.createdAt
      }));
    },
    enabled: !!folder,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Filter galleries for current folder using memo
  const folderGalleries = useMemo(() => {
    if (!galleries) return [];
    
    console.log('[Filtering Galleries]', { 
      total: galleries.length,
      searchQuery,
      galleries 
    });
    
    return galleries.filter((g: Gallery) => {
      const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
      console.log('[Gallery Filter]', {
        id: g.id,
        title: g.name,
        matchesSearch
      });
      return matchesSearch;
    });
  }, [galleries, searchQuery]);

  const handleNavigate = (slug: string) => {
    setLocation(`/g/${slug}`);
  };

  const handleSelectionChange = (newSelectedIds: Set<number>) => {
    setSelectedIds(newSelectedIds);
  };

  const handleItemMoved = async (galleryIds: number[], targetFolderId: number) => {
    try {
      // Find the target folder
      const targetFolder = (galleries as any[]).find(g => g.id === targetFolderId && g.isFolder);
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

      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['folder', folderSlug] }),
        queryClient.invalidateQueries({ queryKey: ['folder-galleries', folderSlug] })
      ]);

      // Refetch the current folder's galleries to update the UI immediately
      await queryClient.refetchQueries({ queryKey: ['folder-galleries', folderSlug] });
    } catch (error) {
      console.error('[Move Error]', error);
      // TODO: Add error toast here
    }
  };

  const isLoading = isFolderLoading || galleriesLoading;

  if (!folderSlug) {
    return null;
  }

  if (isLoading || !folder) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const content = (
    <ScrollArea className="flex-1">
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isListView={false}
        setIsListView={() => {}} // Folder view is always grid view for now
        searchPlaceholder="Search galleries..."
        showNewGalleryButton={false}
      />
      
      {folderGalleries.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4" />
            <p>This folder is empty</p>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <GalleryCardGrid 
            galleries={folderGalleries}
            isListView={false}
            selectable={true}
            draggable={true}
            onNavigate={handleNavigate}
            onSelectionChange={handleSelectionChange}
            onItemMoved={handleItemMoved}
          />
        </div>
      )}
    </ScrollArea>
  );

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  );
}
