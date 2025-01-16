import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FolderPlus, Clock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDrop } from 'react-dnd';

export function DashboardSidebarV2() {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: "GALLERY",
    drop: (item: { id: number }) => {
      console.log(`Gallery ${item.id} dropped into folder`);
      // TODO: Implement gallery move logic
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();

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

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col" ref={dropRef}>
      <div className="p-4 border-b border-border">
        <Button variant="ghost" className="w-full justify-start">
          <Clock className="mr-2 h-4 w-4" />
          Recents
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {folders?.map((folder) => (
            <Button
              key={folder.id}
              variant="ghost"
              className="w-full justify-start"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              {folder.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => setIsCreateOpen(true)}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Folder
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