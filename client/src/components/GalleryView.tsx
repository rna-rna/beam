
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Share2, Trash2, FolderMove, ArrowUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { formatDate } from '@/lib/format-date';
import type { Gallery } from '@/types/gallery';

type ViewMode = 'grid' | 'list';
type SortMode = 'created' | 'viewed' | 'alpha';

interface GalleryViewProps {
  galleries: Gallery[];
  onDelete?: (id: number) => void;
  onShare?: (id: number) => void;
  onMove?: (id: number) => void;
}

export function GalleryView({ galleries, onDelete, onShare, onMove }: GalleryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('created');

  const sortedGalleries = [...galleries].sort((a, b) => {
    switch (sortMode) {
      case 'viewed':
        return (b.lastViewedAt || 0) - (a.lastViewedAt || 0);
      case 'alpha':
        return a.title.localeCompare(b.title);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortMode('created')}>
              Created Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode('viewed')}>
              Last Viewed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode('alpha')}>
              Alphabetical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedGalleries.map((gallery) => (
            <Card key={gallery.id} className="group relative">
              <CardHeader>
                <CardTitle>{gallery.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {gallery.images?.length || 0} images
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {formatDate(gallery.createdAt)}
                </div>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onShare?.(gallery.id)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onMove?.(gallery.id)}>
                      <FolderMove className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(gallery.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedGalleries.map((gallery) => (
            <div
              key={gallery.id}
              className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-accent/50"
            >
              <div>
                <h3 className="font-medium">{gallery.title}</h3>
                <div className="text-sm text-muted-foreground">
                  Created {formatDate(gallery.createdAt)}
                  {gallery.lastViewedAt && ` • Last viewed ${formatDate(gallery.lastViewedAt)}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => onShare?.(gallery.id)}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onMove?.(gallery.id)}>
                  <FolderMove className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete?.(gallery.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
