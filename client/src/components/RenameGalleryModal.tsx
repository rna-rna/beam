
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RenameGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: number;
  currentTitle: string;
  slug: string;
}

export function RenameGalleryModal({ isOpen, onClose, galleryId, currentTitle, slug }: RenameGalleryModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isRenaming, setIsRenaming] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRename = async () => {
    if (!title.trim()) return;
    setIsRenaming(true);
    
    try {
      const res = await fetch(`/api/galleries/${slug}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) throw new Error("Failed to rename gallery");

      queryClient.invalidateQueries(["/api/galleries"]);
      toast({
        title: "Success",
        description: "Gallery renamed successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename gallery",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Gallery Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter gallery title"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  e.preventDefault();
                  handleRename();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !title.trim()}>
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename Gallery"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
