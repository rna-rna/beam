
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
        </DialogHeader>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background shadow-none dark:bg-black',
              headerTitle: 'text-foreground dark:text-white',
              headerSubtitle: 'text-muted-foreground dark:text-zinc-400',
              formFieldLabel: 'dark:text-zinc-300',
              formFieldInput: 'dark:bg-zinc-900 dark:text-white dark:border-zinc-700',
              formFieldError: 'dark:text-red-400',
              footerActionLink: 'dark:text-blue-400',
              dividerLine: 'dark:border-zinc-700',
              dividerText: 'dark:text-zinc-400',
              socialButtonsBlockButton: 'dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white dark:border-zinc-700',
              socialButtonsBlockButtonArrow: 'dark:text-zinc-400',
            }
          }}
          afterSignInUrl={window.location.pathname}
          redirectUrl={window.location.pathname}
        />
      </DialogContent>
    </Dialog>
  );
}
