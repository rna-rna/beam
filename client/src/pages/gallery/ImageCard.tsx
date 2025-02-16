import React from "react";
import { motion } from "framer-motion";
import { Star, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { StarredAvatars } from "@/components/StarredAvatars";

interface ImageCardProps {
  image: any;
  index: number;
  onClick: () => void;
  selectMode: boolean;
  isSelected: boolean;
  onSelect: (imageId: number, event?: React.MouseEvent) => void;
  toggleStar: (imageId: number, isStarred: boolean) => void;
}

export default function ImageCard({
  image,
  index,
  onClick,
  selectMode,
  isSelected,
  onSelect,
  toggleStar,
}: ImageCardProps) {
  return (
    <div
      key={image.id ? image.id : `pending-${index}`}
      className="mb-4 w-full"
      style={{ breakInside: "avoid", position: "relative" }}
    >
      <motion.div
        className={cn(
          "image-container transform transition-opacity duration-200 w-full",
          "cursor-pointer hover:scale-[1.02]",
          selectMode ? "hover:scale-100" : ""
        )}
        onClick={(e) => {
          if (selectMode) {
            onSelect(image.id, e);
          } else {
            onClick();
          }
        }}
      >
        <img
          src={image.localUrl ? image.localUrl : image.displayUrl}
          alt={image.originalFilename || "Uploaded image"}
          className={cn(
            "w-full h-auto rounded-lg object-contain",
            selectMode && isSelected && "opacity-75",
            image.status === "error" && "opacity-50"
          )}
          loading="lazy"
          onError={(e) => {
            if (!image.localUrl) {
              e.currentTarget.src = "https://cdn.beam.ms/placeholder.jpg";
            }
          }}
          draggable={false}
        />
        {image.localUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            {image.status === "uploading" && (
              <>
                <div className="absolute top-2 right-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <Progress value={image.progress} className="w-3/4 h-1" />
              </>
            )}
            {image.status === "finalizing" && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs font-medium">Finalizing...</span>
              </div>
            )}
            {image.status === "error" && (
              <div className="absolute top-2 right-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            )}
          </div>
        )}
        {!selectMode && (
          <div className="absolute bottom-2 left-2">
            <StarredAvatars imageId={image.id} />
          </div>
        )}
        {!selectMode && (
          <div className="absolute bottom-2 right-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(image.id, image.userStarred);
              }}
            >
              {image.userStarred ? (
                <Star className="h-4 w-4 fill-black dark:fill-white" />
              ) : (
                <Star className="h-4 w-4 stroke-black dark:stroke-white fill-transparent" />
              )}
            </Button>
          </div>
        )}
        {selectMode && (
          <div className="absolute top-2 right-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? "bg-primary border-primary" : "bg-background/80 border-background/80"
              }`}
            >
              {isSelected && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
