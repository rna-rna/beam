
import { SignUp } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
        </DialogHeader>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background shadow-none',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
            }
          }}
          afterSignUpUrl="/dashboard"
          redirectUrl="/dashboard"
        />
      </DialogContent>
    </Dialog>
  );
}
