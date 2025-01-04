
import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LightboxDialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onOpenChange?: (open: boolean) => void;
  selectedImage?: {
    id: number;
    starred?: boolean;
  };
}

const LightboxDialogContent = React.forwardRef<
  HTMLDivElement,
  LightboxDialogContentProps
>(({ className, children, onOpenChange, ...props }, ref) => {
  const lightboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (lightboxRef.current) {
      lightboxRef.current.focus({ preventScroll: true });
    }
  }, []);

  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onOpenChange) {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscKey, { capture: true });
    
    return () => {
      window.removeEventListener("keydown", handleEscKey, { capture: true });
    };
  }, [onOpenChange]);

  return (
    <div
      ref={lightboxRef}
      tabIndex={-1}
      {...props}
      className={cn(
        "fixed inset-0 w-screen h-screen z-50 flex items-center justify-center bg-black/100 p-0 outline-none",
        className
      )}
    >
      {children}
      <DialogClose asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4 h-9 w-9 z-50 hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogClose>
    </div>
  );
});

LightboxDialogContent.displayName = "LightboxDialogContent";

export default LightboxDialogContent;
