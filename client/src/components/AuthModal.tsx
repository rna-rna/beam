
import { SignUp } from "@clerk/clerk-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => Promise<void>;
  redirectUrl: string;
}

export function AuthModal({ isOpen, onClose, onComplete, redirectUrl }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-transparent shadow-none p-0',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              rootBox: 'w-full',
              socialButtonsBlockButton: 'bg-secondary hover:bg-secondary/80',
              formFieldInput: 'bg-background',
              dividerLine: 'bg-border',
              dividerText: 'text-muted-foreground'
            }
          }}
          afterSignUpUrl={redirectUrl}
          afterSignUpComplete={onComplete}
          redirectUrl={redirectUrl}
        />
      </DialogContent>
    </Dialog>
  );
}
