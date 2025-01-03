
import { SignUp } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background shadow-none dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
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
          afterSignUpUrl="/dashboard"
          redirectUrl="/dashboard"
        />
      </DialogContent>
    </Dialog>
  );
}
