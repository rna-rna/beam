
import * as React from "react";
import { cn } from "@/lib/utils";

interface LightboxDialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onOpenChange?: (open: boolean) => void;
}

const LightboxDialogContent = React.forwardRef<
  HTMLDivElement,
  LightboxDialogContentProps
>(({ className, children, ...props }, ref) => {
  const lightboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (lightboxRef.current) {
      lightboxRef.current.focus({ preventScroll: true });
    }
  }, []);

  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      console.log('Escape key event target:', e.target);
      if (e.key === "Escape" && props.onOpenChange) {
        e.preventDefault();
        e.stopPropagation();
        props.onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscKey);
    
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [props.onOpenChange]);

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
    </div>
  );
});

LightboxDialogContent.displayName = "LightboxDialogContent";

export default LightboxDialogContent;
