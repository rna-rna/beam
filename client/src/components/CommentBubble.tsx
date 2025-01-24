import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignUp } from "@clerk/clerk-react";

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
  } | string;
  onSubmit?: () => void;
  isNew?: boolean;
  imageId?: number;
}

export function CommentBubble({ x, y, content, author, onSubmit, isNew = false, imageId }: CommentBubbleProps) {
  console.log("CommentBubble author:", { author, color: typeof author === 'object' ? author.color : null });
  
  const [isEditing, setIsEditing] = useState(isNew);
  const [text, setText] = useState(content || "");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Simplified author display logic
  const authorDisplay = typeof author === 'string'
    ? { 
        username: author,
        imageUrl: undefined
      }
    : {
        username: author?.username || 'Unknown User',
        imageUrl: author?.imageUrl
      };

  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) {
        setShowAuthModal(true);
        throw new Error('Please sign in to add comments');
      }

      const token = await getToken().catch(() => null);
      if (!token) {
        throw new Error('Authentication failed: Unable to retrieve token');
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
        let errorMessage = "Failed to add comment";
        try {
          const error = await response.json();
          errorMessage = error.message || error.details || errorMessage;
        } catch (e) {
          errorMessage = "Unexpected server error";
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onMutate: async (newCommentText) => {
      await queryClient.cancelQueries({ queryKey: [`/api/images/${imageId}/comments`] });
      const previousComments = queryClient.getQueryData([`/api/images/${imageId}/comments`]);

      if (user) {
        const optimisticComment = {
          id: Date.now(),
          content: newCommentText,
          xPosition: x,
          yPosition: y,
          author: {
            id: user.id,
            username: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
            imageUrl: user.imageUrl,
            color: user.publicMetadata?.color || '#ccc'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          optimistic: true
        };

        queryClient.setQueryData([`/api/images/${imageId}/comments`], (old: any[] = []) => [
          ...old,
          optimisticComment
        ]);
      }

      return { previousComments };
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/images/${imageId}/comments`], (old: any[] = []) => {
        return old.map((comment) =>
          comment.optimistic && comment.content === data.data.content
            ? {
                ...data.data,
                author: {
                  id: data.data.userId || user?.id,
                  username: data.data.userName || user?.fullName || 'Unknown User',
                  imageUrl: data.data.userImageUrl || user?.imageUrl,
                  color: data.data.userColor || user?.publicMetadata?.color || '#ccc'
                }
              }
            : comment
        );
      });

      setText("");
      setIsEditing(false);
      toast({
        title: "Comment added",
        duration: 2000
      });
      if (onSubmit) {
        onSubmit();
      }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData([`/api/images/${imageId}/comments`], context.previousComments);
      }
      if (!user) {
        setShowAuthModal(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add comment",
          variant: "destructive",
          duration: 3000
        });
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (text.trim()) {
      await commentMutation.mutateAsync(text);
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <MessageCircle className="w-4 h-4" />
        </div>

        <Card className={`absolute left-8 top-0 -translate-y-1/2 w-max max-w-[300px] ${isEditing ? 'p-2' : 'p-3'} bg-card shadow-lg border-primary/20`}>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <Input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-w-[200px] h-8"
                placeholder={user ? "Add comment..." : "Please sign in to comment"}
                readOnly={!user}
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                  }
                }}
                data-comment-input
                autoFocus
              />
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar
                  name={typeof author === 'object' ? 
                    author.fullName || `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.username || 'Unknown User' 
                    : authorDisplay.username}
                  imageUrl={typeof author === 'object' ? author.imageUrl : undefined}
                  color={typeof author === 'object' ? author.color : '#ccc'}
                  size="sm"
                  className="shadow-sm"
                />
                <p className="text-xs font-medium text-muted-foreground">
                  {typeof author === 'object' ? 
                    author.fullName || `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.username || 'Unknown User'
                    : authorDisplay.username}
                </p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </Card>
      </div>

      {showAuthModal && (
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <DialogContent className="max-w-md">
            <h2 className="text-xl font-semibold mb-4">Sign Up to Comment</h2>
            <SignUp afterSignUpUrl={window.location.href} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}