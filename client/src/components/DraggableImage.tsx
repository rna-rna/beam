
import { useDraggable } from '@dnd-kit/core';
import { getR2Image } from "@/lib/r2";
import { motion } from "framer-motion";
import { Star, CheckCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarredAvatars } from "@/components/StarredAvatars";
import type { ImageOrPending } from "@/types/gallery";

interface DraggableImageProps {
  image: ImageOrPending;
  index: number;
  selectMode: boolean;
  selectedImages: number[];
  isReorderMode: boolean;
  onSelect: (id: number, event?: React.MouseEvent) => void;
  onClick: (index: number) => void;
  onStar?: (e: React.MouseEvent) => void;
  showStarButton?: boolean;
  userRole?: string;
}

export function DraggableImage({ 
  image, 
  index,
  selectMode,
  selectedImages,
  isReorderMode,
  onSelect,
  onClick,
  onStar,
  showStarButton = true,
  userRole
}: DraggableImageProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: image.id,
    disabled: !isReorderMode
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="mb-4 w-full"
    >
      <motion.div
        layout={false}
        className={cn(
          "image-container transform transition-opacity duration-200 w-full",
          isReorderMode && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50",
          "localUrl" in image && "opacity-80",
          "block"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={cn(
            "group relative bg-card rounded-lg transform transition-all",
            !isReorderMode ? "hover:scale-[1.02] cursor-pointer" : "",
            selectMode ? "hover:scale-100" : "",
            isReorderMode ? "border-2 border-dashed border-gray-200 border-opacity-50" : ""
          )}
          onClick={(e) => {
            if (isReorderMode) {
              e.stopPropagation();
              return;
            }
            selectMode ? onSelect(image.id, e) : onClick(index);
          }}
        >
          <img
            src={"localUrl" in image ? image.localUrl : getR2Image(image, "thumb")}
            alt={image.originalFilename || "Uploaded image"}
            className={cn(
              "w-full h-auto rounded-lg blur-up transition-opacity duration-200 object-contain",
              selectMode && selectedImages.includes(image.id) && "opacity-75",
              "localUrl" in image && "opacity-80"
            )}
            loading="lazy"
            draggable={false}
          />

          {!selectMode && (
            <div className="absolute bottom-2 left-2 z-10">
              <StarredAvatars imageId={image.id} />
            </div>
          )}

          {showStarButton && !selectMode && userRole && ['owner', 'Edit', 'Comment'].includes(userRole) && (
            <motion.div
              className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.8 }}
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm backdrop-blur-sm"
                onClick={onStar}
              >
                <motion.div
                  animate={{
                    scale: image.userStarred ? 1.2 : 1,
                    opacity: image.userStarred ? 1 : 0.6,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {image.userStarred ? (
                    <Star className="h-4 w-4 fill-black dark:fill-white transition-all duration-300" />
                  ) : (
                    <Star className="h-4 w-4 stroke-black dark:stroke-white fill-transparent transition-all duration-300" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
          )}

          {!selectMode && image.commentCount! > 0 && (
            <Badge
              className="absolute top-2 right-2 bg-primary text-primary-foreground flex items-center gap-1"
              variant="secondary"
            >
              <MessageSquare className="w-3 h-3" />
              {image.commentCount}
            </Badge>
          )}

          {selectMode && !isReorderMode && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 z-10"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedImages.includes(image.id)
                    ? "bg-primary border-primary"
                    : "bg-background/80 border-background/80"
                }`}
              >
                {selectedImages.includes(image.id) && (
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
