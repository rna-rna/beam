
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, SmilePlus } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignUp } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";

interface CommentBubbleProps {
  x: number;
  y: number;
  content?: string;
  author?: {
    id: string;
    username: string;
    imageUrl?: string;
    color?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  onSubmit?: () => void;
  isNew?: boolean;
  imageId?: number;
  id?: number;
  reactions?: Array<{emoji: string, count: number, userIds: string[]}>;
  children?: React.ReactNode;
  onPositionChange?: (x: number, y: number) => void;
  replies: Array<{
    id: number;
    content: string;
    author: {
      id: string;
      username: string;
      imageUrl?: string;
      color?: string;
    };
    createdAt: string;
  }>;
  parentId?: number | null;
  timestamp?: string;
}

import { Button } from "@/components/ui/button";

export function CommentBubble({ 
  x, 
  y, 
  content, 
  author, 
  onSubmit, 
  isNew = false, 
  imageId,
  id,
  reactions = [],
  children,
  onPositionChange,
  parentId = null,
  timestamp,
  replies = []
}: CommentBubbleProps) {
  const { user } = useUser();
  const isAuthor = user?.id === author?.id;
  const [isEditing, setIsEditing] = useState(isNew);
  const [text, setText] = useState(content || "");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isNew);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the comment bubble
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setIsHovered(false);
        if (!isNew) {
          setIsEditing(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNew]);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dragConstraints = useRef(null);

  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) {
        setShowAuthModal(true);
        throw new Error('Please sign in to add comments');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: commentText,
          xPosition: x,
          yPosition: y
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setText("");
      setIsEditing(false);
      if (onSubmit) onSubmit();
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    },
    onError: (error) => {
      if (!user) {
        setShowAuthModal(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add comment",
          variant: "destructive"
        });
      }
    }
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ newX, newY }: { newX: number, newY: number }) => {
      const token = await getToken();
      const response = await fetch(`/api/comments/${id}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ x: newX, y: newY })
      });

      if (!response.ok) throw new Error('Failed to update position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    }
  });

  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const token = await getToken();
      const response = await fetch(`/api/comments/${id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) throw new Error('Failed to add reaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    }
  });

  const handleDragEnd = (_e: any, info: { point: { x: number; y: number } }) => {
    if (isAuthor && onPositionChange) {
      const newX = (info.point.x / window.innerWidth) * 100;
      const newY = (info.point.y / window.innerHeight) * 100;
      onPositionChange(newX, newY);
      updatePositionMutation.mutate({ newX, newY });
    }
    setIsDragging(false);
  };

  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !id) return;
      const token = await getToken();
      const response = await fetch(`/api/comments/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to post reply');
      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      setIsReplying(false);
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
    }
  });

  return (
    <motion.div
      ref={bubbleRef}
      drag={isAuthor}
      dragConstraints={dragConstraints}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className="absolute"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isExpanded && setIsHovered(false)}
      onClick={() => setIsExpanded(true)}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 1000 : 1
      }}
    >
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <MessageCircle className="w-4 h-4" />
        </div>

        <Card className={cn(
          "absolute left-8 top-0 -translate-y-1/2 w-max max-w-[300px]",
          isEditing ? "p-2" : "p-3",
          "bg-card shadow-lg border-primary/20",
          (!isHovered && !isExpanded) && "hidden",
          "transition-all duration-200"
        )}>
          {isEditing ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (text.trim()) {
                await commentMutation.mutateAsync(text);
                setIsExpanded(false);
                setIsHovered(false);
              }
            }}>
              <div className="flex items-center gap-2">
                <UserAvatar
                  size="sm"
                  name={user?.firstName || "Guest"}
                  imageUrl={user?.imageUrl}
                  color={user?.publicMetadata?.color as string}
                />
                <Input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 h-10 px-4 bg-background/80 backdrop-blur-sm border-0 shadow-none rounded-full focus-visible:ring-1 focus-visible:ring-offset-0"
                  placeholder={user ? "Add a comment" : "Please sign in to comment"}
                  readOnly={!user}
                  onClick={() => {
                    if (!user) setShowAuthModal(true);
                  }}
                  autoFocus
                />
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    name={author?.fullName || author?.username || 'Unknown User'}
                    imageUrl={author?.imageUrl}
                    color={author?.color || '#ccc'}
                    size="sm"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {author?.fullName || author?.username || 'Unknown User'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{content}</p>
              {reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  {reactions.map((reaction, i) => (
                    <button
                      key={i}
                      onClick={() => addReactionMutation.mutate(reaction.emoji)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5",
                        "bg-muted hover:bg-muted/80 transition-colors",
                        reaction.userIds.includes(user?.id || '') && "bg-primary/20"
                      )}
                    >
                      <span>{reaction.emoji}</span>
                      <span>{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}
              {!parentId && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        replyMutation.mutate(replyContent);
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowEmojiPicker(true)}
                    className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted/80"
                  >
                    <SmilePlus className="w-4 h-4" />
                  </button>
                </div>
              )}
              {replies && replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {replies.map((reply) => (
                    <CommentBubble
                      key={reply.id}
                      id={reply.id}
                      content={reply.content}
                      author={reply.author}
                      x={x}
                      y={y + 10}
                      parentId={id}
                    />
                  ))}
                </div>
              )}
              {children}
            </div>
          )}
        </Card>
      </div>

      {showAuthModal && (
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <DialogContent className="max-w-md">
            <SignUp afterSignUpUrl={window.location.href} />
          </DialogContent>
        </Dialog>
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            addReactionMutation.mutate(emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </motion.div>
  );
}
