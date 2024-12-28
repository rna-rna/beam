import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

export function AuthModal({ isOpen, onClose, action = "continue" }: AuthModalProps) {
  const { openSignIn } = useAuth();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            Please sign in or create an account to {action}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            onClose();
            openSignIn();
          }}>
            Sign In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
