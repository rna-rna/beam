import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface CommentBubbleProps {
  x: number;
  y: number;
  content?: string;
  author?: string;
  savedAuthor?: string;
  onSubmit?: (content: string, author: string) => void;
  isNew?: boolean;
}

export function CommentBubble({ x, y, content, author, savedAuthor, onSubmit, isNew = false }: CommentBubbleProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [text, setText] = useState(content || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && onSubmit) {
      onSubmit(text, savedAuthor || author || "Anonymous");
      setIsEditing(false);
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
                placeholder="Add comment..."
                data-comment-input
                autoFocus
              />
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar name={author || "Anonymous"} className="w-6 h-6 text-xs" />
                <p className="text-xs font-medium text-muted-foreground">
                  {author || "Anonymous"}
                </p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}