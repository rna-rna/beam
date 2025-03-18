import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/clerk-react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { 
  MessageSquare, 
  MoreVertical, 
  Heart, 
  Trash2, 
  Pencil 
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type CommentState = "idle" | "replying" | "editing";

interface Author {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  color?: string;
}

interface Reaction {
  id?: number;
  userId: string;
  type: string;
}

interface CommentBubbleProps {
  id?: number;
  x: number;
  y: number;
  content?: string;
  author?: Author;
  imageId?: number;
  replies?: any[];
  parentId?: number | null;
  isNew?: boolean;
  isExpanded?: boolean;
  timestamp?: Date | string;
  onSubmit?: () => void;
  reactions?: Reaction[];
  onPositionChange?: (x: number, y: number) => void;
}

export function CommentBubble({
  id,
  x = 50,
  y = 50,
  content = "",
  author,
  imageId,
  replies = [],
  parentId = null,
  isNew = false,
  isExpanded = false,
  timestamp,
  onSubmit,
  reactions = [],
  onPositionChange
}: CommentBubbleProps) {
  const { user } = useUser();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(content);
  const [state, setState] = useState<CommentState>(isExpanded ? "replying" : "idle");
  const [showReplies, setShowReplies] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isAuthor = user?.id === author?.id;
  const isLoggedIn = !!user;
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const controls = useDragControls();
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Add state to track dragging position
  const [position, setPosition] = useState({ x, y });
  const initialPositionRef = useRef({ x, y });
  
  // Update the position when props change
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x, y });
      initialPositionRef.current = { x, y };
    }
  }, [x, y, isDragging]);

  // Auto-focus the textarea when expanding for commenting
  useEffect(() => {
    if ((isNew || state === "replying" || state === "editing") && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [isNew, state]);

  const { getToken } = useAuth();

  // Add comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (newComment: {
      content: string;
      imageId: number;
      parentId?: number | null;
    }) => {
      const token = await getToken();
      const response = await fetch(`/api/images/${newComment.imageId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newComment.content,
          parentId: newComment.parentId,
          xPosition: isNew ? x : undefined,
          yPosition: isNew ? y : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create comment");
      }

      return response.json();
    },
    onSuccess: () => {
      // Reset state
      setReplyContent("");
      setState("idle");
      onSubmit?.();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${imageId}/comments`],
      });
      console.log("Comment added successfully");
    },
    onError: (error) => {
      console.error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const token = await getToken();
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${imageId}/comments`],
      });
      console.log("Comment deleted successfully");
    },
    onError: (error) => {
      console.error(`Failed to delete comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => {
      const token = await getToken();
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      return response.json();
    },
    onSuccess: () => {
      setState("idle");
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${imageId}/comments`],
      });
      console.log("Comment updated successfully");
    },
    onError: (error) => {
      console.error(`Failed to update comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Like comment mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({
      commentId,
      reactionType = "like",
    }: {
      commentId: number;
      reactionType?: string;
    }) => {
      const token = await getToken();
      const response = await fetch(`/api/comments/${commentId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: reactionType }),
      });

      if (!response.ok) {
        throw new Error("Failed to react to comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${imageId}/comments`],
      });
    },
    onError: (error) => {
      console.error(`Failed to react to comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleStartDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    controls.start(event);
    setIsDragging(true);
    initialPositionRef.current = position;
    event.stopPropagation();
  };

  // Handle the end of dragging
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Only call onPositionChange if the position actually changed and we have a valid ID
    if (onPositionChange && id && 
        (position.x !== initialPositionRef.current.x || 
         position.y !== initialPositionRef.current.y)) {
      console.log("Sending position update from CommentBubble:", {
        id,
        x: position.x,
        y: position.y,
        originalX: initialPositionRef.current.x,
        originalY: initialPositionRef.current.y
      });
      onPositionChange(position.x, position.y);
    }
  };

  // Handle active dragging
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!bubbleRef.current) return;

    // Get the parent container (the image container)
    const parent = bubbleRef.current.closest('.gallery-container');
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    
    // Calculate new position in percentage (relative to parent)
    const newX = ((info.point.x - parentRect.left) / parentRect.width) * 100;
    const newY = ((info.point.y - parentRect.top) / parentRect.height) * 100;
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));
    
    // Update position state in real-time
    setPosition({ x: clampedX, y: clampedY });
  };

  const handleSubmit = () => {
    if (!imageId || replyContent.trim() === "") return;

    createCommentMutation.mutate({
      content: replyContent.trim(),
      imageId,
      parentId: id,
    });
  };

  const handleDelete = () => {
    if (!id) return;
    deleteCommentMutation.mutate(id);
  };

  const handleEdit = () => {
    setState("editing");
  };

  const handleUpdateComment = () => {
    if (!id || editContent.trim() === "") return;

    updateCommentMutation.mutate({
      commentId: id,
      content: editContent.trim(),
    });
  };

  const handleLike = () => {
    if (!id) return;
    toggleLikeMutation.mutate({ commentId: id });
  };

  const handleClickBubble = () => {
    if (isNew || state !== "idle") return;
    setState("replying");
  };

  // For editing or creating new comments
  if (isNew || state === "editing") {
    return (
      <motion.div
        ref={bubbleRef}
        className={cn(
          "absolute bg-background/90 backdrop-blur-sm p-2 rounded-lg border shadow-md z-10 w-64",
          isDark ? "border-white/20" : "border-gray-200"
        )}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "translate(-50%, -50%)"
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <div className="space-y-2">
          <Textarea
            ref={commentInputRef}
            placeholder="Add your comment..."
            value={isNew ? replyContent : editContent}
            onChange={(e) => isNew ? setReplyContent(e.target.value) : setEditContent(e.target.value)}
            className="w-full resize-none text-sm"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isNew) {
                  onSubmit?.();
                } else {
                  setState("idle");
                }
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (isNew) {
                  if (replyContent.trim() === "" || !imageId) return;
                  createCommentMutation.mutate({
                    content: replyContent.trim(),
                    imageId,
                  });
                } else {
                  handleUpdateComment();
                }
              }}
              disabled={(isNew ? replyContent : editContent).trim() === ""}
            >
              {isNew ? "Comment" : "Update"}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // For viewing existing comments
  return (
    <motion.div
      ref={bubbleRef}
      className={cn("absolute z-10", isDragging ? "cursor-grabbing" : isAuthor ? "cursor-grab" : "")}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transformOrigin: "center center",
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: "-50%",
        y: "-50%",
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      drag={isAuthor}
      dragControls={controls}
      onPointerDown={isAuthor ? handleStartDrag : undefined}
      dragMomentum={false}
      dragElastic={0.1}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
    >
      <div
        className={cn(
          "flex flex-col space-y-2",
          state === "replying" && "pb-10"
        )}
      >
        {/* Comment bubble */}
        <div
          className={cn(
            "p-3 rounded-lg max-w-xs shadow-md backdrop-blur-sm relative",
            isDark
              ? "bg-black/70 text-white border border-white/20"
              : "bg-white/95 border border-gray-100",
            state === "replying" && "pb-12"
          )}
          onClick={handleClickBubble}
        >
          {/* Author info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author?.imageUrl} />
                <AvatarFallback
                  style={{ backgroundColor: author?.color || "#ccc" }}
                  className="text-[10px] font-semibold text-white"
                >
                  {author?.firstName?.charAt(0) || author?.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {author?.firstName || author?.username || "User"}
              </span>
              {timestamp && (
                <span className="text-xs text-muted-foreground">
                  {typeof timestamp === "string"
                    ? formatDistanceToNowStrict(new Date(timestamp), {
                        addSuffix: true,
                      })
                    : formatDistanceToNowStrict(timestamp, { addSuffix: true })}
                </span>
              )}
            </div>

            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment content */}
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

          {/* Actions row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleLike}
              >
                <Heart
                  className={cn(
                    "h-3 w-3 mr-1",
                    reactions?.some(
                      (r) => r.userId === user?.id && r.type === "like"
                    ) && "fill-red-500 text-red-500"
                  )}
                />
                {reactions?.filter((r) => r.type === "like").length || 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setState("replying")}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>

            {replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? "Hide replies" : `${replies.length} replies`}
              </Button>
            )}
          </div>

          {/* Reply input area */}
          {state === "replying" && (
            <div className="absolute bottom-2 left-2 right-2 flex flex-col space-y-2">
              <Textarea
                ref={commentInputRef}
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full resize-none text-xs"
                rows={1}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setState("idle")}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleSubmit}
                  disabled={replyContent.trim() === ""}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Replies display */}
        {showReplies && replies.length > 0 && (
          <div className="pl-4 space-y-2 mt-1">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className={cn(
                  "p-2 rounded-lg max-w-[calc(100%-16px)] shadow-sm",
                  isDark
                    ? "bg-black/70 text-white border border-white/10"
                    : "bg-white/90 border border-gray-100"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={reply.author?.imageUrl} />
                    <AvatarFallback
                      style={{ backgroundColor: reply.author?.color || "#ccc" }}
                      className="text-[8px] font-semibold text-white"
                    >
                      {reply.author?.firstName?.charAt(0) ||
                        reply.author?.username?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">
                    {reply.author?.firstName ||
                      reply.author?.username ||
                      "User"}
                  </span>
                  {reply.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(reply.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap break-words">
                  {reply.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection dot at center */}
      <div
        className={cn(
          "absolute w-3 h-3 rounded-full border-2 top-0 left-0 -translate-x-1/2 -translate-y-1/2 transform",
          isDark
            ? "bg-white/70 border-black"
            : "bg-accent border-background"
        )}
      />
    </motion.div>
  );
} 