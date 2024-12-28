import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CommentBubbleProps {
  x: number;
  y: number;
  content?: string;
  author?: string;
  onSubmit?: () => void;
  isNew?: boolean;
  imageId?: number;
}

export function CommentBubble({ x, y, content, author, onSubmit, isNew = false, imageId }: CommentBubbleProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [text, setText] = useState(content || "");
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) {
        throw new Error('Please sign in to add comments');
      }

      console.log('Debug - Attempting to get token');
      const token = await getToken().catch(() => null);

      if (!token) {
        console.log('Debug - Token retrieval failed');
        throw new Error('Authentication failed: Unable to retrieve token');
      }

      console.log('Debug - Submitting comment:', {
        hasToken: !!token,
        userId: user.id,
        imageId
      });

      const response = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: commentText,
          xPosition: x,
          yPosition: y,
          userId: user.id
        })
      });

      if (!response.ok) {
        let errorMessage = "Failed to add comment";
        try {
          const error = await response.json();
          errorMessage = error.message || error.details || errorMessage;
          console.log('Debug - Comment submission error:', error);
        } catch (e) {
          console.log('Debug - Failed to parse error response:', e);
          errorMessage = "Unexpected server error";
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Debug - Comment submission successful:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      setText(""); // Clear the input after successful submission
      setIsEditing(false);
      toast({
        title: "Comment added",
        duration: 2000
      });
      if (onSubmit) {
        onSubmit();
      }
    },
    onError: (error: Error) => {
      console.error('Comment submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
        duration: 3000
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Please sign in to comment",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    if (text.trim()) {
      await commentMutation.mutateAsync(text);
    }
  };

  // Ensure we have proper author information
  const displayName = author || (user ? `${user.firstName} ${user.lastName}`.trim() : null);

  if (!displayName && !isNew) {
    return null; // Don't render invalid comments
  }

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
        {/* Comment dot/icon */}
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <MessageCircle className="w-4 h-4" />
        </div>

        {/* Comment bubble */}
        <Card className={`absolute left-8 top-0 -translate-y-1/2 w-max max-w-[300px] ${isEditing ? 'p-2' : 'p-3'} bg-card shadow-lg border-primary/20`}>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <Input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-w-[200px] h-8"
                placeholder={user ? "Add comment..." : "Please sign in to comment"}
                disabled={!user || commentMutation.isPending}
                data-comment-input
                autoFocus
              />
            </form>
          ) : (
            <div>
              {displayName && (
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar 
                    name={displayName}
                    imageUrl={user?.imageUrl} 
                    className="w-6 h-6 text-xs" 
                  />
                  <p className="text-xs font-medium text-muted-foreground">
                    {displayName}
                  </p>
                </div>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}