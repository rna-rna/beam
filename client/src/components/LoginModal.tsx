
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
              card: 'bg-background shadow-none dark:bg-black',
              headerTitle: 'text-foreground dark:text-white',
              headerSubtitle: 'text-muted-foreground dark:text-gray-400',
              formFieldLabel: 'dark:text-gray-300',
              formFieldInput: 'dark:bg-gray-900 dark:text-white dark:border-gray-700',
              formFieldError: 'dark:text-red-400',
              footerActionLink: 'dark:text-blue-400',
              dividerLine: 'dark:border-gray-700',
              dividerText: 'dark:text-gray-400',
              socialButtonsBlockButton: 'dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-white dark:border-gray-700',
              socialButtonsBlockButtonArrow: 'dark:text-gray-400',
            }
          }}
          afterSignInUrl={window.location.pathname}
          redirectUrl={window.location.pathname}
        />
      </DialogContent>
    </Dialog>
  );
}
