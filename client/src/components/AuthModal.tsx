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
  redirectPath?: string;
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  action = "continue",
  redirectPath 
}: AuthModalProps) {
  const { signIn } = useAuth();

  const handleSignIn = () => {
    console.log('[Auth Debug] Initiating sign in with redirect:', redirectPath || window.location.pathname);
    onClose();
    signIn.create({
      redirectUrl: redirectPath || window.location.pathname,
      initialValues: {
        redirectUrl: redirectPath || window.location.pathname
      }
    });
  };

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
          <Button onClick={handleSignIn}>
            Sign In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}