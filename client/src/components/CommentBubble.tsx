import { useState, useRef, useEffect, useCallback } from "react";
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
import { mixpanel } from '@/lib/analytics'; // Added Mixpanel import

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
  const inputRef = useRef<HTMLInputElement>(null); // Added inputRef

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

  const [localCommentId, setLocalCommentId] = useState<number | null>(null);

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

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setText("");
      setIsEditing(false);
      if (onSubmit) onSubmit();
      setLocalCommentId(data.data.id);
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
      // Mixpanel tracking for successful comment creation
      mixpanel.track("Comment Created", {
        imageId: imageId,
        galleryId: null, // Needs to be fetched or passed as a prop
        commentLength: text.length,
        parentCommentId: parentId || null,
        userRole: user.publicMetadata.role // Assumes user role is in publicMetadata
      });
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
        // Mixpanel tracking for comment creation error
        mixpanel.track("Comment Failed", {
          error: error.message,
          imageId: imageId,
          galleryId: null, // Needs to be fetched or passed as a prop
          parentCommentId: parentId || null,
          userRole: user.publicMetadata.role // Assumes user role is in publicMetadata
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
      if (!user || !id) {
        throw new Error('Must be logged in to react');
      }
      const token = await getToken();
      const response = await fetch(`/api/comments/${id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          emoji,
          commentId: id,
          userId: user.id 
        })
      });

      if (!response.ok) throw new Error('Failed to add reaction');
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add reaction",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // Invalidate both comments and reactions queries
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
      queryClient.invalidateQueries([`/api/comments/${id}/reactions`]);
      // Force refetch
      queryClient.refetchQueries([`/api/images/${imageId}/comments`]);
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
    mutationFn: async () => {
      // Ensure imageId is a valid number
      const numericImageId = typeof imageId === 'string' ? parseInt(imageId, 10) : imageId;
      if (!numericImageId || isNaN(numericImageId)) {
        throw new Error(`Invalid imageId: Expected a number, got ${typeof imageId}`);
      }



      // Validate all required fields upfront
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      if (!replyContent.trim()) {
        throw new Error('Reply content is empty');
      }
      if (!numericImageId || typeof numericImageId !== 'number' || isNaN(numericImageId)) {

        throw new Error('Valid image ID is required');
      }
      if (!id && !parentId) {
        throw new Error('Parent comment ID is missing');
      }

      const token = await getToken();
      const endpoint = `/api/images/${imageId}/comments`;



      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: replyContent.trim(),
          xPosition: x,
          yPosition: y,
          parentId: id || parentId,
          imageId: numericImageId
        })
      });

      if (!response.ok) {
        const error = await response.text();

        throw new Error(error);
      }

      const data = await response.json();

      return data;
    },
    onError: (error) => {
      console.error("Reply mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive"
      });
      // Mixpanel tracking for reply creation error
      mixpanel.track("Comment Failed", {
        error: error.message,
        imageId: imageId,
        galleryId: null, // Needs to be fetched or passed as a prop
        parentCommentId: parentId || null,
        userRole: user.publicMetadata.role // Assumes user role is in publicMetadata
      });
    },
    onSuccess: (data) => {
      setReplyContent('');
      setIsReplying(false);
      queryClient.invalidateQueries([`/api/images/${imageId}/comments`]);
      // Mixpanel tracking for successful reply creation
      mixpanel.track("Comment Created", {
        imageId: imageId,
        galleryId: null, // Needs to be fetched or passed as a prop
        commentLength: replyContent.length,
        parentCommentId: id || parentId,
        userRole: user.publicMetadata.role, // Assumes user role is in publicMetadata
        commentType: "reply"
      });
    }
  });

  useEffect(() => {
    // Focus the input when component is mounted if it's a new comment or if it's in editing mode
    if (isNew || isEditing) {
      // Use multiple timeouts with increasing delays for more reliable focus
      const attempts = [100, 200, 300, 500];
      
      attempts.forEach(delay => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            console.log(`Focus attempt at ${delay}ms`, { isNew, isEditing });
          }
        }, delay);
      });
    }
  }, [isNew, isEditing]);

  // Additional effect to re-attempt focus if the component becomes visible/expanded
  useEffect(() => {
    if (isExpanded && inputRef.current && isEditing) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log("Re-focusing on expansion", { isExpanded, isEditing });
        }
      }, 50);
    }
  }, [isExpanded, isEditing]);


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
                // Focus the input first to ensure the browser recognizes it as active
                inputRef.current?.focus();
                await commentMutation.mutateAsync(text);
                setIsExpanded(false);
                setIsHovered(false);
              } else {
                // If empty text, re-focus the input
                inputRef.current?.focus();
              }
            }}>
              <div className="flex items-center gap-2">
                <UserAvatar
                  size="xs"
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
                  ref={inputRef} // Changed ref to inputRef
                />
              </div>
            </form>
          ) : (
            <div>
              <div className="flex gap-2">
                <UserAvatar
                  name={author?.fullName || author?.username || 'Unknown User'}
                  imageUrl={author?.imageUrl}
                  color={author?.color || '#ccc'}
                  size="xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {author?.fullName || author?.username || 'Unknown User'}
                    </span>
                    {timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(new Date(timestamp))}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{content}</p>
                </div>
              </div>
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
              {timestamp && (
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatRelativeDate(new Date(timestamp))}
                </span>
              )}
              {replies && replies.length > 0 && (
                <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                  {replies.map((reply) => (
                    <div key={reply.id} className="relative">
                      <div className="flex gap-2 items-start">
                        <UserAvatar
                          size="xs"
                          name={reply.author?.username ?? "Unknown"}
                          imageUrl={reply.author?.imageUrl}
                          color={reply.author?.color ?? '#ccc'}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {reply.author?.username || 'Unknown User'}
                            </span>
                            {reply.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDate(new Date(reply.createdAt))}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{reply.content}</p>
                          {reply.reactions && reply.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {reply.reactions.map((reaction, i) => (
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!parentId && (id || localCommentId) && (
                <div className="flex items-center gap-2 mt-2">
                  <UserAvatar
                    size="xs"
                    name={user?.firstName || "Guest"}
                    imageUrl={user?.imageUrl}
                    color={user?.publicMetadata?.color as string}
                  />
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        replyMutation.mutate();
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
            if (!user) {
              setShowAuthModal(true);
              setShowEmojiPicker(false);
              return;
            }
            addReactionMutation.mutate(emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </motion.div>
  );
}

function formatRelativeDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return "Just now";
  }
}