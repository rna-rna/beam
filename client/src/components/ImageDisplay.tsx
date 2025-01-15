
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { ImageOrPending } from "@/types/gallery";
import { Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImageDisplayProps {
  image: ImageOrPending;
  loading?: boolean;
  className?: string;
}

export function ImageDisplay({ image, loading, className }: ImageDisplayProps) {
  return (
    <AspectRatio 
      ratio={'localUrl' in image ? (image.width / image.height) : (image.width && image.height ? image.width / image.height : 4/3)}
      className={cn("bg-muted rounded-lg overflow-hidden", className)}
    >
      <div className="relative w-full h-full">
        <img
          src={'localUrl' in image ? image.localUrl : image.url}
          alt={'originalFilename' in image ? image.originalFilename : 'Uploaded image'}
          className={cn(
            "absolute inset-0 w-full h-full object-cover rounded-lg transition-opacity duration-200",
            'localUrl' in image && "opacity-80",
            image.status === "error" && "opacity-50"
          )}
          loading="lazy"
          onLoad={(e) => {
            e.currentTarget.classList.add('loaded');
            if (!('localUrl' in image) && image.pendingRevoke) {
              setTimeout(() => URL.revokeObjectURL(image.pendingRevoke), 800);
            }
          }}
          draggable={false}
        />
        
        {'localUrl' in image && (
          <div className="absolute inset-0 flex items-center justify-center ring-2 ring-purple-500/40">
            {image.status === "uploading" && (
              <>
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-2 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <Progress value={image.progress} className="w-3/4 h-1" />
              </>
            )}
            {image.status === "error" && (
              <div className="absolute top-2 right-2 bg-destructive/80 backdrop-blur-sm p-2 rounded-full">
                <AlertCircle className="h-4 w-4 text-destructive-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </AspectRatio>
  );
}
