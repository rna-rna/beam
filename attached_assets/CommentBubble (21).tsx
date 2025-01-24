import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, MessageCircle } from "lucide-react"
import { EmojiReactions } from "./EmojiReactions"
import { formatRelativeTime } from "../utils/formatRelativeTime"
import { CommentInput } from "./CommentInput"
import Image from "next/image"
import { SpeechBubble } from "./SpeechBubble"

interface CommentBubbleProps {
  id: string
  author: string
  content: string
  timestamp: Date
  onEdit: (id: string, newContent: string) => void
  onDelete: (id: string) => void
  onReply: (id: string, replyContent: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export const CommentBubble: React.FC<CommentBubbleProps> = ({
  id,
  author,
  content,
  timestamp,
  onEdit,
  onDelete,
  onReply,
  isExpanded,
  onToggleExpand,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isHovered, setIsHovered] = useState(false)
  const [justExpanded, setJustExpanded] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      if (justExpanded) {
        inputRef.current.focus()
        setJustExpanded(false)
      }
    }
  }, [isExpanded, justExpanded])

  const handleEdit = () => {
    onEdit(id, editedContent)
    setIsEditing(false)
  }

  const handleReply = (content: string) => {
    onReply(id, content)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (!isExpanded) {
          setJustExpanded(true)
        }
        onToggleExpand()
      }}
    >
      <SpeechBubble
        className={`w-10 h-10 p-1 cursor-pointer transition-all duration-200 ${isExpanded || isHovered ? "scale-0" : "scale-100"}`}
      >
        <div className="relative w-full h-full rounded-full overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative size-[16px] overflow-hidden">
                <Image src={`/placeholder.svg?text=${i}`} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </SpeechBubble>

      <Card
        className={`absolute top-0 left-0 w-[400px] bg-white shadow-sm border-0 transition-all duration-200 ease-in-out ${isExpanded || isHovered ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <SpeechBubble className="flex-shrink-0 w-10 h-10 p-1">
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <div className="grid grid-cols-2 gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative size-[16px] overflow-hidden">
                      <Image src={`/placeholder.svg?text=${i}`} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </SpeechBubble>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{author}</span>
                <span className="text-muted-foreground/60 text-sm">{formatRelativeTime(timestamp)}</span>
              </div>

              {isEditing ? (
                <div className="mt-2">
                  <CommentInput
                    onSubmit={(content) => {
                      handleEdit()
                      setEditedContent(content)
                    }}
                    onCancel={() => setIsEditing(false)}
                    isReply
                    initialContent={editedContent}
                  />
                </div>
              ) : (
                <p className="text-sm mt-1 break-words">{content}</p>
              )}

              {!isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground/60 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                  >
                    <MessageCircle className="size-4 mr-1.5" />
                    Edit
                  </Button>
                  <EmojiReactions commentId={id} />
                </div>
              )}
            </div>

            {!isEditing && (
              <Button
                size="sm"
                variant="ghost"
                className="size-8 p-0 text-muted-foreground/60 hover:text-foreground -mt-1"
                onClick={(e) => {
                  e.stopPropagation()
                  // Add more options functionality here
                }}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 pl-[52px]">
              <CommentInput onSubmit={handleReply} isReply inputRef={inputRef} autoFocus={justExpanded} />
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

