import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import DrawingCanvas from "@/components/DrawingCanvas";
import CommentBubble from "@/components/CommentBubble";
import { cn } from "@/lib/utils";

interface LightboxModalProps {
  isOpen: boolean;
  selectedImage: any;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onImageComment: (e: React.MouseEvent<HTMLDivElement>) => void;
  annotations: any[];
  comments: any[];
  toggleAnnotations: () => void;
  isAnnotationsVisible: boolean;
  onStarToggle: (imageId: number, isStarred: boolean) => void;
  imageDimensions: { width: number; height: number } | null;
  setImageDimensions: (dims: { width: number; height: number } | null) => void;
}

export default function LightboxModal({
  isOpen,
  selectedImage,
  onClose,
  onNavigate,
  onImageComment,
  annotations,
  comments,
  toggleAnnotations,
  isAnnotationsVisible,
  onStarToggle,
  imageDimensions,
  setImageDimensions,
}: LightboxModalProps) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="relative bg-black">
        {selectedImage.originalFilename && (
          <div className="absolute top-6 left-6 bg-background/80 backdrop-blur-sm rounded px-3 py-1.5 text-sm font-medium z-50">
            {selectedImage.originalFilename}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50"
          onClick={() => onNavigate(0)} // Replace 0 with your previous index logic
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50"
          onClick={() => onNavigate(0)} // Replace 0 with your next index logic
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="absolute right-16 top-4 flex items-center gap-2 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStarToggle(selectedImage.id, selectedImage.userStarred)}
          >
            {selectedImage.userStarred ? (
              <Star className="h-5 w-5 fill-black dark:fill-white" />
            ) : (
              <Star className="h-5 w-5 stroke-black dark:stroke-white fill-transparent" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleAnnotations}>
            {isAnnotationsVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
        <motion.div
          className={cn("relative w-full h-full flex items-center justify-center", {
            "cursor-crosshair": true,
          })}
          onClick={onImageComment}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              position: "relative",
              width: "100%",
              aspectRatio:
                selectedImage.width && selectedImage.height
                  ? `${selectedImage.width}/${selectedImage.height}`
                  : "16/9",
              overflow: "hidden",
            }}
          >
            <motion.img
              src={selectedImage.url}
              alt={selectedImage.originalFilename || ""}
              className="object-contain"
              style={{
                width: "100%",
                height: "100%",
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageDimensions({ width: img.clientWidth, height: img.clientHeight });
              }}
            />
            <div className="absolute inset-0">
              <DrawingCanvas
                width={imageDimensions?.width || 800}
                height={imageDimensions?.height || 600}
                imageWidth={imageDimensions?.width}
                imageHeight={imageDimensions?.height}
                isDrawing={false}
                savedPaths={isAnnotationsVisible ? annotations : []}
                onSavePath={async (pathData) => {
                  // (Save annotation logic here)
                }}
              />
            </div>
            {isAnnotationsVisible &&
              selectedImage.id &&
              comments.map((comment: any) => (
                <CommentBubble
                  key={comment.id}
                  id={comment.id}
                  x={comment.xPosition}
                  y={comment.yPosition}
                  content={comment.content}
                  author={comment.author}
                  imageId={selectedImage.id}
                  replies={comment.replies || []}
                  parentId={comment.parentId}
                />
              ))}
          </div>
        </motion.div>
      </div>
    </Dialog>
  );
}
