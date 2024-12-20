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
  const [isNameStep, setIsNameStep] = useState(isNew && !savedAuthor);
  const [text, setText] = useState(content || "");
  const [authorName, setAuthorName] = useState(savedAuthor || author || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNameStep) {
      if (authorName.trim()) {
        setIsNameStep(false);
        // Focus the comment input after name is entered
        setTimeout(() => {
          const commentInput = document.querySelector('[data-comment-input]') as HTMLInputElement;
          if (commentInput) commentInput.focus();
        }, 0);
      }
    } else if (text.trim() && onSubmit) {
      onSubmit(text, authorName.trim() || "Anonymous");
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
        {/* Comment dot/icon - increased touch target */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg touch-manipulation">
          <MessageCircle className="w-5 h-5" />
        </div>

        {/* Comment bubble */}
        <Card className={`absolute left-10 top-0 -translate-y-1/2 w-max max-w-[320px] ${isEditing ? 'p-3' : 'p-4'} bg-card shadow-lg border-primary/20`}>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {isNameStep ? (
                <Input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="min-w-[240px] h-10 text-base"
                  placeholder="Enter your name"
                  autoFocus
                />
              ) : (
                <Input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-w-[240px] h-10 text-base"
                  placeholder="Add comment..."
                  data-comment-input
                  autoFocus
                />
              )}
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserAvatar name={author || "Anonymous"} className="w-8 h-8 text-sm" />
                <p className="text-sm font-medium text-muted-foreground">
                  {author || "Anonymous"}
                </p>
              </div>
              <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}