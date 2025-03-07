import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, SmilePlus, Move, GripHorizontal } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignUp } from "@clerk/clerk-react";
import { motion, PanInfo, useDragControls } from "framer-motion";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";
import { mixpanel } from '@/lib/analytics'; // Added Mixpanel import
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    reactions?: Array<{emoji: string, count: number, userIds: string[]}>;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDragHint, setShowDragHint] = useState(false);
  const containerRef = useRef<Element | null>(null);
  const dragControls = useDragControls();
  
  // Track position locally but initialize from props
  const [position, setPosition] = useState({ x, y });
  
  // Update local position when props change (but not during dragging)
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x, y });
    }
  }, [x, y, isDragging]);

  // Find and store the container reference on mount and when dragging starts
  const findContainer = useCallback(() => {
    if (!bubbleRef.current) return null;
    
    // Find the closest parent with gallery-container class
    const container = bubbleRef.current.closest('.gallery-container') || 
                      bubbleRef.current.closest('.lightbox-img-container');
    
    if (container) {
      return container;
    }
    
    // Fallback to any gallery container in the document
    return document.querySelector('.gallery-container') || 
           document.querySelector('.lightbox-img-container') || 
           document.documentElement;
  }, []);

  // Store container reference on mount
  useEffect(() => {
    containerRef.current = findContainer();
  }, [findContainer]);

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
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}/comments`] });
      // Mixpanel tracking for successful comment creation
      if (user) {
        mixpanel.track("Comment Created", {
          imageId: imageId,
          galleryId: null, // Needs to be fetched or passed as a prop
          commentLength: text.length,
          parentCommentId: parentId || null,
          userRole: user.publicMetadata.role // Assumes user role is in publicMetadata
        });
      }
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
    mutationFn: async ({ x, y, commentId = id }: { x: number, y: number, commentId?: number }) => {
      if (!commentId) throw new Error('Comment ID is required');
      
      const token = await getToken();
      console.log("Sending position update to server:", { commentId, x, y });
      
      const response = await fetch(`/api/comments/${commentId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ x, y })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Position update failed:", errorText);
        throw new Error('Failed to update position');
      }
      
      const result = await response.json();
      console.log("Position update success:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Position updated successfully:", data);
      if (imageId) {
        queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}/comments`] });
      }
    },
    onError: (error) => {
      console.error("Error updating position:", error);
      toast({
        title: "Error",
        description: "Failed to save comment position",
        variant: "destructive"
      });
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
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${id}/reactions`] });
      // Force refetch
      queryClient.refetchQueries({ queryKey: [`/api/images/${imageId}/comments`] });
    }
  });

  const handleDragStart = (event: React.PointerEvent) => {
    if (!isAuthor) return;
    
    console.log("Drag start", { isAuthor });
    setIsDragging(true);
    
    // Start the drag with the controls
    dragControls.start(event);
    
    // Update container reference when drag starts
    containerRef.current = findContainer();
  };

  const handleDrag = (_e: any, info: PanInfo) => {
    if (!isAuthor || !containerRef.current || !bubbleRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    
    // Center the comment to the mouse cursor by accounting for the bubble's dimensions
    const offsetX = bubbleRect.width / 2;
    const offsetY = bubbleRect.height / 2;
    
    // Calculate adjusted mouse position
    const mouseX = info.point.x;
    const mouseY = info.point.y;
    
    // Calculate percentage position relative to the container
    const newX = ((mouseX - rect.left) / rect.width) * 100;
    const newY = ((mouseY - rect.top) / rect.height) * 100;
    
    // Ensure values are within bounds
    const boundedX = Math.max(0, Math.min(100, newX));
    const boundedY = Math.max(0, Math.min(100, newY));
    
    // Update local state for immediate feedback
    setPosition({ x: boundedX, y: boundedY });
  };

  const handleDragEnd = (_e: any, info: PanInfo) => {
    console.log("Drag end detected", { isAuthor, info });
    
    if (!isAuthor || !containerRef.current) {
      setIsDragging(false);
      return;
    }
    
    try {
      // Use the position state which has been updated during drag
      // This ensures we save exactly what the user sees
      const finalPosition = position;
      
      console.log("Saving final position:", { 
        x: finalPosition.x, 
        y: finalPosition.y, 
        commentId: id,
        containerId: containerRef.current.id, 
        containerClass: containerRef.current.className
      });
      
      // Notify parent component if available
      if (onPositionChange) {
        onPositionChange(finalPosition.x, finalPosition.y);
      }
      
      // Always update the position on the server if we have an ID
      if (id) {
        // Update position on the server and persist in database
        updatePositionMutation.mutate({ 
          commentId: id,
          x: finalPosition.x, 
          y: finalPosition.y 
        });
      }
    } catch (error) {
      console.error("Error updating comment position:", error);
    } finally {
      setIsDragging(false);
    }
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
      if (user) {
        mixpanel.track("Comment Failed", {
          error: error.message,
          imageId: imageId,
          galleryId: null, // Needs to be fetched or passed as a prop
          parentCommentId: parentId || null,
          userRole: user.publicMetadata.role // Assumes user role is in publicMetadata
        });
      }
    },
    onSuccess: (data) => {
      setReplyContent('');
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}/comments`] });
      // Mixpanel tracking for successful reply creation
      if (user) {
        mixpanel.track("Comment Created", {
          imageId: imageId,
          galleryId: null, // Needs to be fetched or passed as a prop
          commentLength: replyContent.length,
          parentCommentId: id || parentId,
          userRole: user.publicMetadata.role, // Assumes user role is in publicMetadata
          commentType: "reply"
        });
      }
    }
  });

  useEffect(() => {
    // Focus the input when component is mounted if it's a new comment or if it's in editing mode
    if (inputRef.current && (isNew || isEditing)) {
      // Use a longer timeout to ensure the component is fully rendered and animated in
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log("Focusing input field", { isNew, isEditing });
        }
      }, 100); // Increased timeout for more reliable focus
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
      dragMomentum={false}
      dragElastic={0}
      dragControls={dragControls}
      layoutId={`comment-${id}`} 
      dragConstraints={containerRef.current ? {
        top: 0,
        right: containerRef.current.clientWidth,
        bottom: containerRef.current.clientHeight,
        left: 0
      } : undefined}
      dragTransition={{ 
        power: 0, 
        timeConstant: 0,
        bounceStiffness: 0,
        bounceDamping: 0
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className="absolute"
      onMouseEnter={() => {
        setIsHovered(true);
        if (isAuthor && !isDragging) setShowDragHint(true);
      }}
      onPointerDown={(e) => {
        if (isAuthor) handleDragStart(e);
      }}
      onMouseLeave={() => {
        if (!isExpanded) setIsHovered(false);
        setShowDragHint(false);
      }}
      onClick={() => setIsExpanded(true)}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 1000 : 1,
        cursor: isAuthor ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none'
      }}
    >
      <div className="relative">
        <TooltipProvider>
          <Tooltip open={showDragHint && isAuthor && !isEditing && !isDragging}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-primary-foreground transition-all duration-200",
                  isAuthor ? "bg-primary cursor-move" : "bg-primary",
                  isDragging && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {isAuthor && (showDragHint || isDragging) ? (
                  <GripHorizontal className="w-4 h-4" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Drag to reposition your comment</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
                  ref={inputRef}
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