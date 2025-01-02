
import { SignIn } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
        </DialogHeader>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background shadow-none',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
            }
          }}
          afterSignInUrl={window.location.pathname}
          redirectUrl={window.location.pathname}
        />
      </DialogContent>
    </Dialog>
  );
}
