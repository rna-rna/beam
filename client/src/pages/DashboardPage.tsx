import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { queryClient } from '@/lib/query-client';
import { GalleryGrid } from '@/components/gallery-grid';
import { RecentGrid } from '@/components/recent-grid';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFolders } from '@/components/dashboard-folders';

const DashboardPage: React.FC = () => {
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [createGalleryDialog, setCreateGalleryDialog] = useState(false);

  // Add a function to handle dropping galleries onto the Drafts section
  const handleDraftsDropZone = async (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      // Get the drag data
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('[Drafts Drop]', data);
      
      if (data.type !== 'gallery') {
        toast({
          title: "Invalid operation",
          description: "Only galleries can be moved to drafts",
          variant: "destructive"
        });
        return;
      }
      
      // Extract the gallery IDs that are being moved
      const galleryIds = data.ids;
      if (!galleryIds.length) return;
      
      toast({
        title: "Moving galleries...",
        description: `Moving ${galleryIds.length} ${galleryIds.length === 1 ? 'gallery' : 'galleries'} to drafts`,
      });
      
      // Call API to move galleries to root (no folder)
      const response = await fetch(`/api/galleries/move-to-root`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          galleryIds: galleryIds,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to move galleries to drafts');
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
      
      toast({
        title: "Success",
        description: `${galleryIds.length} ${galleryIds.length === 1 ? 'gallery' : 'galleries'} moved to drafts`,
      });
    } catch (error) {
      console.error('[Drop Error]', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move galleries to drafts",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Navigation</h2>
              <DashboardNav />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Folders</h2>
                <Button variant="ghost" size="icon" onClick={() => setCreateFolderDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <DashboardFolders />
            </div>
          </div>
          
          <div className="md:w-3/4 space-y-8">
            {/* Drafts section with drop zone */}
            <div 
              className="space-y-2 border border-dashed border-transparent hover:border-muted-foreground/20 rounded-lg p-4 transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('bg-muted/20');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-muted/20');
              }}
              onDrop={(e) => {
                e.currentTarget.classList.remove('bg-muted/20');
                handleDraftsDropZone(e);
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Drafts</h2>
                <Button onClick={() => setCreateGalleryDialog(true)}>New Gallery</Button>
              </div>
              <GalleryGrid />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Recent</h2>
              <RecentGrid />
            </div>
          </div>
        </div>
      </main>
      
      {/* ... rest of the code ... */}
    </div>
  );
};

export default DashboardPage; 