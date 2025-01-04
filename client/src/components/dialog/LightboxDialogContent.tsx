
import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Star } from "lucide-react";
import { Image } from "@/types/gallery";
import { StarredAvatars } from "@/components/StarredAvatars";
import { motion } from "framer-motion";

interface LightboxDialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onOpenChange?: (open: boolean) => void;
  selectedImage?: Image;
  setSelectedImage?: (image: Image | null) => void;
}

const LightboxDialogContent = React.forwardRef<
  HTMLDivElement,
  LightboxDialogContentProps
>(({ className, children, onOpenChange, selectedImage, setSelectedImage, ...props }, ref) => {
  const lightboxRef = React.useRef<HTMLDivElement>(null);
  const [showStarIndicator, setShowStarIndicator] = React.useState(false);

  const triggerStarIndicator = React.useCallback(() => {
    setShowStarIndicator(true);
    setTimeout(() => setShowStarIndicator(false), 1500);
  }, []);

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
      {showStarIndicator && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center z-[60]"
        >
          {selectedImage?.userStarred ? (
            <Star className="h-24 w-24 fill-black dark:fill-white" />
          ) : (
            <Star className="h-24 w-24 stroke-black dark:stroke-white fill-transparent" />
          )}
        </motion.div>
      )}
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
      
      {/* Starred avatars */}
      {selectedImage && (
        <div className="absolute bottom-4 right-4 z-50">
          <StarredAvatars imageId={selectedImage.id} />
        </div>
      )}
    </div>
  );
});

LightboxDialogContent.displayName = "LightboxDialogContent";

export default LightboxDialogContent;
