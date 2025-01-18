import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Clock, ChevronRight, MoreVertical, FolderOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDrop } from 'react-dnd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export function DashboardSidebar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleMoveGallery = async (galleryIds: number[], targetFolderId: number) => {
    try {
      await Promise.all(galleryIds.map(async (galleryId) => {
        const res = await fetch(`/api/galleries/${galleryId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: targetFolderId })
        });

        if (!res.ok) throw new Error('Failed to move gallery');
      }));
      await queryClient.invalidateQueries(['/api/galleries']);
      await queryClient.invalidateQueries(['/api/folders']);
    } catch (error) {
      console.error('Failed to move gallery:', error);
    }
  };

  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setIsCreateOpen(false);
      setNewFolderName('');
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete folder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  });

  const FolderItem = ({ folder }: { folder: any }) => {
    const [{ isOver }, dropRef] = useDrop(() => ({
      accept: "GALLERY",
      drop: (item: { selectedIds: number[] }) => {
        handleMoveGallery(item.selectedIds, folder.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver()
      })
    }));

    return (
      <div ref={dropRef} className={`group relative ${isOver ? 'bg-accent' : ''}`}>
        <Button
          variant="ghost"
          className="w-full justify-start group-hover:pr-8"
          onClick={() => setLocation(`/f/${folder.slug}`)}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          {folder.name}
          <span className="ml-auto text-xs text-muted-foreground">
            {folder.galleryCount}
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => deleteFolderMutation.mutate(folder.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="shrink-0 p-4 space-y-1 border-b border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => setLocation("/dashboard/drafts")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Drafts
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => setLocation("/dashboard/recents")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Recents
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
          {folders?.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Folder
          </Button>
        </div>
      </ScrollArea>

      <div className="shrink-0 p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/dashboard?view=trash")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createFolderMutation.mutate(newFolderName);
          }}>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
            />
            <Button type="submit" className="mt-4">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}