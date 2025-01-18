import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Clock, FileText, Folder, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
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
      <ScrollArea className="h-[calc(100vh-130px)]">
        <div className="p-4 space-y-4">
          <Button
            variant={selectedSection === 'projects' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setSelectedSection('projects');
              setLocation("/dashboard");
            }}
          >
            <Folder className="mr-2 h-4 w-4" />
            My Projects
          </Button>
          <Button
            variant={selectedSection === 'recents' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setSelectedSection('recents');
              setLocation("/dashboard/recents");
            }}
          >
            <Clock className="mr-2 h-4 w-4" />
            Recents
          </Button>
          <Button
            variant={selectedSection === 'drafts' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setSelectedSection('drafts');
              setLocation("/dashboard/drafts");
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Drafts
          </Button>
          <Separator />
          <div className="font-semibold px-2">Folders</div>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={(selectedSection === 'folders' && selectedFolder === folder.id) || location.pathname === `/f/${folder.slug}` ? "secondary" : "ghost"}
              className="w-full justify-start"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('opacity-50');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('opacity-50');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('opacity-50');
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const draggedItem = JSON.parse(data);
                if (draggedItem.type === 'gallery') {
                  // Add API call to move gallery to folder
                  const res = await fetch(`/api/galleries/${draggedItem.id}/move`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folderId: folder.id })
                  });
                  if (res.ok) {
                    queryClient.invalidateQueries({ queryKey: ['folders'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
                  }
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                setSelectedFolder(folder.id);
                setSelectedSection('folders');
                setLocation(`/f/${folder.slug}`, { replace: true });
              }}
            >
              <Folder className="mr-2 h-4 w-4" />
              {folder.name}
            </Button>
          ))}
          <Separator />
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
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
          <FolderPlus className="mr-2 h-4 w-4" /> Add Folder
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
    </>
  );
}