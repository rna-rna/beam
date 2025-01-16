
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DeleteGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: number;
  galleryTitle: string;
}

export function DeleteGalleryModal({ isOpen, onClose, galleryId, galleryTitle }: DeleteGalleryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/galleries/${galleryId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete gallery");

      queryClient.invalidateQueries(["/api/galleries"]);
      toast({
        title: "Success",
        description: "Gallery deleted successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete gallery",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Gallery</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{galleryTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Gallery"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
