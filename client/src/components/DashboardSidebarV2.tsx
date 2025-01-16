
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FolderPlus, Clock, FolderOpen } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDrop } from "react-dnd";

export function DashboardSidebarV2({ onFolderSelect }: { onFolderSelect: (id: number | null) => void }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setIsCreateOpen(false);
      setNewFolderName('');
    }
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: "GALLERY",
    drop: (item: { id: number }) => {
      console.log(`Gallery ${item.id} dropped into folder`);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div className="w-64 border-r bg-background/95 p-4" ref={dropRef}>
      <div className="space-y-2">
        <button
          onClick={() => onFolderSelect(null)}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-muted"
        >
          <Clock className="h-4 w-4" />
          <span>All Galleries</span>
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-muted"
          >
            <FolderOpen className="h-4 w-4" />
            <span>{folder.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
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
