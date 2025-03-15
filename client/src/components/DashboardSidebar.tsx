import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Clock, Folder, Trash2, MoreVertical, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { DeleteFolderModal } from '@/components/DeleteFolderModal';
import { RenameFolderModal } from '@/components/RenameFolderModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Folder {
  id: number;
  name: string;
  slug: string;
}

export function DashboardSidebar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<'folders' | 'drafts' | 'recents' | 'trash'>('folders');
  const [deleteFolder, setDeleteFolder] = useState<{ id: number; name: string } | null>(null);
  const [renameFolder, setRenameFolder] = useState<{ id: number; name: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<number | null>(null);

  const { data: folders = [] } = useQuery({
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

  const handleMoveToFolder = async (galleryIds: number[], folderId: number) => {
    try {
      const res = await fetch('/api/galleries/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryIds, folderId })
      });
      
      if (!res.ok) throw new Error('Failed to move galleries');
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-galleries'] });
    } catch (error) {
      console.error('Error moving galleries:', error);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full"> 
        <div className="flex-1 overflow-hidden">
          <div className="p-4 space-y-4">
            <Button
              variant={selectedSection === 'recents' ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSection('recents');
                setLocation("/dashboard");
              }}
            >
              <Clock className="mr-2 h-4 w-4" />
              Recents
            </Button>
            <Button
              variant={selectedSection === 'projects' ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSection('projects');
                setLocation("/dashboard/projects");
              }}
            >
              <Folder className="mr-2 h-4 w-4" />
              My Projects
            </Button>
            <Button
              variant={selectedSection === 'trash' ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSection('trash');
                setLocation("/dashboard/trash");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Trash
            </Button>
            <Separator />
            <div className="flex items-center justify-between px-2">
              <div className="font-semibold">Folders</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCreateOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
            {folders.map((folder) => (
              <div 
                key={folder.id} 
                className={`group relative ${dragOverFolder === folder.id ? 'bg-primary/10 rounded-lg' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverFolder(folder.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverFolder(null);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverFolder(null);
                  
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (data.type === 'gallery') {
                      await handleMoveToFolder(data.ids, folder.id);
                    }
                  } catch (error) {
                    console.error('Error handling drop:', error);
                  }
                }}
              >
                <Button
                  variant={(selectedSection === 'folders' && selectedFolder === folder.id) || location.pathname === `/f/${folder.slug}` ? "secondary" : "ghost"}
                  className="w-full justify-between group-hover:bg-accent"
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setSelectedSection('folders');
                    
                    queryClient.prefetchQuery({
                      queryKey: ['folder', folder.slug],
                      queryFn: () => fetch(`/api/folders/${folder.slug}`).then(res => res.json())
                    }).then(() => {
                      setLocation(`/f/${folder.slug}`, {
                        replace: true
                      });
                    });
                  }}
                >
                  <div className="flex items-center">
                    <Folder className="mr-2 h-4 w-4" />
                    {folder.name}
                  </div>
                  {dragOverFolder === folder.id && (
                    <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                      <div className="absolute -right-2 -top-2 bg-primary text-primary-foreground rounded-full p-1">
                        <FolderPlus className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <div className="opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameFolder({ id: folder.id, name: folder.name });
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDeleteFolder({ id: folder.id, name: folder.name });
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Button>
              </div>
            ))}
          </div>
        </div>
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
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
              >
                {createFolderMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {deleteFolder && (
        <DeleteFolderModal
          isOpen={true}
          onClose={() => setDeleteFolder(null)}
          folderId={deleteFolder.id}
          folderName={deleteFolder.name}
        />
      )}
      {renameFolder && (
        <RenameFolderModal
          isOpen={true}
          onClose={() => setRenameFolder(null)}
          folderId={renameFolder.id}
          currentName={renameFolder.name}
        />
      )}
    </>
  );
}