
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
      <DialogContent className="sm:max-w-md max-h-[90vh] p-4 overflow-y-auto">
        <DialogHeader>
        </DialogHeader>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background shadow-none dark:bg-black',
              headerTitle: 'text-foreground dark:text-white text-xl sm:text-2xl',
              headerSubtitle: 'text-muted-foreground dark:text-zinc-400 text-sm sm:text-base',
              formFieldLabel: 'dark:text-zinc-300',
              formFieldInput: 'dark:bg-zinc-900 dark:text-white dark:border-zinc-700',
              formFieldError: 'dark:text-red-400',
              footerActionLink: 'dark:text-blue-400',
              dividerLine: 'dark:border-zinc-400',
              dividerText: 'dark:text-zinc-400',
              socialButtonsBlockButton: 'dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white dark:border-zinc-700',
              socialButtonsBlockButtonArrow: 'dark:text-zinc-400',
              rootBox: 'w-full gap-3',
              form: 'gap-3',
              formButtonPrimary_mobile: 'py-2',
              formFieldInput_mobile: 'py-1.5',
              socialButtonsBlockButton_mobile: 'py-1.5'
            }
          }}
          afterSignUpUrl="/dashboard"
          redirectUrl="/dashboard"
        />
      </DialogContent>
    </Dialog>
  );
}
