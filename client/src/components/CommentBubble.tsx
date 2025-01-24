
import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, MessageCircle, Edit, Trash2 } from "lucide-react";
import { EmojiReactions } from "./EmojiReactions";
import { UserAvatar } from "./UserAvatar";
import { formatRelativeTime } from "@/lib/format-date";
import { CommentInput } from "@/components/CommentInput";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SpeechBubble } from "@/components/SpeechBubble";

interface Author {
  id: string;
  username: string;
  imageUrl?: string;
  color?: string;
}

interface CommentBubbleProps {
  id: string;
  author: Author;
  content: string;
  timestamp: Date;
  x: number;
  y: number;
  replies?: any[];
  imageId: number;
  onSubmit?: (content: string) => void;
  isNew?: boolean;
}

export function CommentBubble({ 
  id,
  author,
  content,
  timestamp,
  x,
  y,
  replies = [],
  imageId,
  onSubmit,
  isNew = false
}: CommentBubbleProps) {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(isNew);
  const [isExpanded, setIsExpanded] = useState(isNew);
  const [isHovered, setIsHovered] = useState(false);
  const controls = useDragControls();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = user?.id === author.id;
  
  const updatePositionMutation = useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      const res = await fetch(`/api/comments/${id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      });
      if (!res.ok) throw new Error('Failed to update position');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to update comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
      setIsEditing(false);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    }
  });

  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/comments/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to create reply');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
      setIsExpanded(false);
    }
  });

  return (
    <motion.div
      drag={isOwner}
      dragControls={controls}
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        updatePositionMutation.mutate({
          x: x + info.offset.x,
          y: y + info.offset.y
        });
      }}
      initial={{ x, y }}
      animate={{ x, y }}
      className="absolute"
      style={{ left: 0, top: 0 }}
    >
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SpeechBubble 
          className={cn(
            "w-10 h-10 cursor-pointer transition-all duration-200",
            (isExpanded || isHovered) ? "scale-0" : "scale-100",
            isOwner && "cursor-grab active:cursor-grabbing"
          )}
        >
          <UserAvatar
            name={author.username}
            imageUrl={author.imageUrl}
            color={author.color}
            size="sm"
          />
        </SpeechBubble>

        <Card className={cn(
          "absolute top-0 left-0 w-[400px] bg-white shadow-sm border-0 transition-all duration-200",
          (isExpanded || isHovered) ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <SpeechBubble className="flex-shrink-0 w-10 h-10">
                <UserAvatar
                  name={author.username}
                  imageUrl={author.imageUrl}
                  color={author.color}
                  size="sm"
                />
              </SpeechBubble>

              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{author.username}</span>
                    <span className="text-muted-foreground/60 text-sm">
                      {formatRelativeTime(timestamp)}
                    </span>
                  </div>
                  
                  {isOwner && !isEditing && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => deleteCommentMutation.mutate()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <CommentInput
                    onSubmit={(content) => {
                      if (onSubmit) {
                        onSubmit(content);
                      } else {
                        updateCommentMutation.mutate(content);
                      }
                    }}
                    onCancel={() => setIsEditing(false)}
                    initialContent={content}
                    inputRef={inputRef}
                    autoFocus
                  />
                ) : (
                  <p className="text-sm mt-1 break-words">{content}</p>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground/60 hover:text-foreground"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1.5" />
                      Reply
                    </Button>
                    <EmojiReactions commentId={id} imageId={imageId} />
                  </div>
                )}
              </div>
            </div>

            {isExpanded && !isEditing && (
              <div className="mt-4 pl-[52px] space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-3">
                    <UserAvatar
                      name={reply.author.username}
                      imageUrl={reply.author.imageUrl}
                      color={reply.author.color}
                      size="sm"
                    />
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{reply.author.username}</span>
                        <span className="text-muted-foreground/60 text-sm">
                          {formatRelativeTime(reply.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{reply.content}</p>
                    </div>
                  </div>
                ))}
                
                <CommentInput
                  onSubmit={(content) => createReplyMutation.mutate(content)}
                  isReply
                  placeholder="Write a reply..."
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
