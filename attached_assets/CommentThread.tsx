import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, X, Check } from "lucide-react"
import Image from "next/image"
import { CommentInput } from "./CommentInput"
import { formatRelativeTime } from "../utils/formatRelativeTime"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
  replies?: Comment[]
}

interface CommentThreadProps {
  comment: Comment
  onEdit: (id: string, newContent: string) => void
  onDelete: (id: string) => void
  onReply: (id: string, replyContent: string) => void
  onClose?: () => void
}

export function CommentThread({ comment, onEdit, onDelete, onReply, onClose }: CommentThreadProps) {
  return (
    <Card className="w-[400px] bg-white shadow-sm border-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/10">
        <h3 className="text-base font-medium">Comment</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground">
            <Check className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-shrink-0 relative size-10 grid grid-cols-2 gap-0.5 rounded-full overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative size-[18px] overflow-hidden">
                <Image src={`/placeholder.svg?text=${i}`} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author}</span>
                <span className="text-muted-foreground/60 text-sm">{formatRelativeTime(comment.timestamp)}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground -mt-1"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm mt-1 break-words">{comment.content}</p>
          </div>
        </div>

        <CommentInput
          onSubmit={(content) => onReply(comment.id, content)}
          placeholder="Write a reply..."
          className="mt-4"
        />
      </div>
    </Card>
  )
}

