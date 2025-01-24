
import { useState, forwardRef } from "react"
import { SmileIcon, AtSign, ImageIcon, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CommentInputProps {
  onSubmit: (content: string) => void
  onCancel?: () => void
  className?: string
  isReply?: boolean
  initialContent?: string
  inputRef?: React.RefObject<HTMLTextAreaElement>
  autoFocus?: boolean
}

export const CommentInput = forwardRef<HTMLTextAreaElement, CommentInputProps>(
  ({ onSubmit, onCancel, className, isReply = false, initialContent = "", inputRef, autoFocus }, ref) => {
    const [content, setContent] = useState(initialContent)

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (content.trim()) {
        onSubmit(content)
        setContent("")
      }
    }

    // If it's the main comment input, use the pill design
    if (!isReply) {
      return (
        <form onSubmit={handleSubmit} className={cn("group flex items-center gap-3 max-w-[600px]", className)}>
          <div className="size-10 rounded-full bg-[#1E90FF] flex-shrink-0" />
          <div className="relative flex-grow">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment"
              className="w-full px-4 py-2.5 rounded-full bg-white shadow-sm border-0 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/20 pr-12"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-gray-100 transition-colors"
              disabled={!content.trim()}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </form>
      )
    }

    // For replies, use the design with gray background and action buttons
    return (
      <form onSubmit={handleSubmit} className={cn("relative", className)}>
        <div className="relative">
          <div className="min-h-[120px] p-4 bg-gray-50/80 rounded-lg">
            <textarea
              ref={inputRef || ref}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full h-full min-h-[80px] bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 text-sm"
              autoFocus={autoFocus}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
                >
                  <SmileIcon className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
                >
                  <AtSign className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={!content.trim()}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    )
  },
)

CommentInput.displayName = "CommentInput"
