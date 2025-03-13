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
            {/* Folders feature disabled */}
            </div>
        </ScrollArea>
        {/* Add Folder button disabled */}
      </div>

      {/* Folder modals disabled */}
    </>
  );
}