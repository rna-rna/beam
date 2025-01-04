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
      if (e.key === "Escape" && props.onOpenChange) {
        e.preventDefault();
        e.stopPropagation();
        props.onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscKey, { capture: true });
    
    return () => {
      window.removeEventListener("keydown", handleEscKey, { capture: true });
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
      {/* Starred avatars */}
            {selectedImage && (
              <div className="absolute bottom-6 right-6 z-50">
                <StarredAvatars imageId={selectedImage.id} />
              </div>
            )}
            <div className="absolute right-4 top-4 flex items-center gap-2 z-50">
              {selectedImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStarMutation.mutate(selectedImage.id);
                  }}
                >
                  {selectedImage.starred ? (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 ${isAnnotationMode ? "bg-primary/20" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAnnotationMode(!isAnnotationMode);
                    setIsCommentPlacementMode(false);
                    setNewCommentPos(null);
                  }}
                  title="Toggle Drawing Mode"
                >
                  <Paintbrush className={`h-4 w-4 ${isAnnotationMode ? "text-primary" : ""}`} />
                </Button>
                <SignedIn>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 ${isCommentPlacementMode ? "bg-primary/20" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCommentPlacementMode(!isCommentPlacementMode);
                      setIsAnnotationMode(false);
                      setNewCommentPos(null);
                    }}
                    title="Add Comment"
                  >
                    <MessageSquare className={`h-4 w-4 ${isCommentPlacementMode ? "text-primary" : ""}`} />
                  </Button>
                </SignedIn>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  title={showAnnotations ? "Hide Comments" : "Show Comments"}
                >
                  {showAnnotations ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
    </div>
  );
});

LightboxDialogContent.displayName = "LightboxDialogContent";

export default LightboxDialogContent;