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

export function DashboardSidebar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<'folders' | 'drafts' | 'recents' | 'trash'>('folders');
  const [deleteFolder, setDeleteFolder] = useState<{ id: number; name: string } | null>(null);
  const [renameFolder, setRenameFolder] = useState<{ id: number; name: string } | null>(null);

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

  return (
    <>
      <div className="flex flex-col h-full relative">
        <ScrollArea className="flex-1">
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
            <div className="font-semibold px-2">Folders</div>
            {folders.map((folder) => (
              <div key={folder.id} className="group relative flex items-center">
                <Button
                  variant={(selectedSection === 'folders' && selectedFolder === folder.id) || location.pathname === `/f/${folder.slug}` ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setSelectedSection('folders');
                    setLocation(`/f/${folder.slug}`);
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {folder.name}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
              </div>
            ))}
            </div>
        </ScrollArea>
        <div className="sticky bottom-0 w-full p-4 border-t bg-background">
          <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> Add Folder
          </Button>
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
            />
            <Button type="submit" className="mt-4">Create</Button>
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