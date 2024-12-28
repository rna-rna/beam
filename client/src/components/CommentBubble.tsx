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
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error('Please sign in to add comments');
      }

      const token = await getToken().catch(() => null);
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          xPosition: x,
          yPosition: y
        })
      });

      if (!response.ok) {
        let errorMessage = "Failed to add comment";
        try {
          const error = await response.json();
          errorMessage = error.message;
        } catch {
          errorMessage = "Unexpected server error.";
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}/comments`] });
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
      toast({
        title: error.message || "Failed to add comment",
        variant: "destructive",
        duration: 2000
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

  // Use authenticated user's name for new comments, or passed author for existing ones
  const displayName = isNew ? 
    (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : null) : 
    author;

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
                disabled={!user}
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