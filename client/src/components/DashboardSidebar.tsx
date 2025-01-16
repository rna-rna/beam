
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleMoveGallery = async (galleryIds: number[], folderId: number) => {
    try {
      await Promise.all(galleryIds.map(async (galleryId) => {
        const res = await fetch(`/api/galleries/${galleryId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId })
        });

        if (!res.ok) throw new Error('Failed to move gallery');
      }));
      
      await queryClient.invalidateQueries(['/api/galleries']);
      toast({
        title: "Success",
        description: "Galleries moved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move galleries",
        variant: "destructive"
      });
    }
  };

  const [{ isOver }, dropRef] = useDrop({
    accept: "GALLERY",
    drop: (item: { selectedIds: number[] }, monitor) => {
      if (folder?.id) {
        handleMoveGallery(item.selectedIds, folder.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

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

  return (
    <div ref={dropRef} className={cn(
      "w-64 bg-card border-r border-border h-screen flex flex-col",
      isOver && "bg-accent/20"
    )}>
      <div className="shrink-0 p-4 border-b border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
        >
          <Clock className="mr-2 h-4 w-4" />
          Recents
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
          {folders?.map((folder) => (
            <div key={folder.id} className="group relative">
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
