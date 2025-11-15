import React from "react";
import { CommentBubble } from "@/components/CommentBubble";
import { CommentModal } from "@/components/CommentModal";
import { Comment, Annotation } from "@/types/gallery";
import { cn } from "@/lib/utils";

interface GalleryCommentSystemProps {
  comments: Comment[];
  annotations: Annotation[];
  showAnnotations: boolean;
  isCommentPlacementMode: boolean;
  isCommentModalOpen: boolean;
  newCommentPos: { x: number; y: number } | null;
  selectedImageId: number | null;
  onCommentModalClose: () => void;
  onCommentSubmit: (content: string) => void;
  onCommentPositionChange?: (commentId: number, x: number, y: number) => void;
  onCommentDelete?: (commentId: number) => void;
  onCommentUpdate?: (commentId: number, content: string) => void;
}

export const GalleryCommentSystem: React.FC<GalleryCommentSystemProps> = ({
  comments,
  annotations,
  showAnnotations,
  isCommentPlacementMode,
  isCommentModalOpen,
  newCommentPos,
  selectedImageId,
  onCommentModalClose,
  onCommentSubmit,
  onCommentPositionChange,
  onCommentDelete,
  onCommentUpdate,
}) => {
  if (!showAnnotations && !isCommentModalOpen) {
    return null;
  }

  return (
    <>
      {/* Render comment bubbles */}
      {showAnnotations && comments.map((comment) => (
        <CommentBubble
          key={comment.id}
          id={comment.id}
          x={comment.x}
          y={comment.y}
          content={comment.content}
          author={comment.author}
          imageId={selectedImageId || undefined}
          reactions={comment.reactions}
          replies={comment.replies || []}
          parentId={comment.parentId}
          timestamp={comment.createdAt}
          onPositionChange={onCommentPositionChange}
        />
      ))}

      {/* Comment modal for new comments */}
      {isCommentModalOpen && newCommentPos && (
        <CommentModal
          isOpen={isCommentModalOpen}
          position={newCommentPos}
          onClose={onCommentModalClose}
          onSubmit={onCommentSubmit}
        />
      )}
    </>
  );
};

/**
 * Hook to handle comment click positioning
 */
export const useCommentPositioning = (
  isCommentPlacementMode: boolean,
  onPositionSet: (pos: { x: number; y: number }) => void
) => {
  const handleImageClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isCommentPlacementMode) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      onPositionSet({ x, y });
    },
    [isCommentPlacementMode, onPositionSet]
  );

  return { handleImageClick };
};