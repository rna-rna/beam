import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SignIn } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  position?: { x: number; y: number };
}

export function CommentModal({ isOpen, onClose, onSubmit, position }: CommentModalProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const { isSignedIn, isLoaded } = useUser();

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    onSubmit(content);
    setContent("");
    onClose();
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSignedIn ? "Add Comment" : "Sign in to Comment"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {isSignedIn ? (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your comment..."
                className="min-h-[100px]"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  Post Comment
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <SignIn afterSignInUrl={window.location.href} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
