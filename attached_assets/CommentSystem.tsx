import type React from "react"
import { useState } from "react"
import { CommentBubble } from "./CommentBubble"
import { CommentInput } from "./CommentInput"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
  x: number
  y: number
  replies?: Comment[]
}

export const CommentSystem: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([])
  const [expandedComment, setExpandedComment] = useState<string | null>(null)
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null)

  const handleCommentEdit = (id: string, newContent: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) => (comment.id === id ? { ...comment, content: newContent } : comment)),
    )
  }

  const handleCommentDelete = (id: string) => {
    setComments((prevComments) => prevComments.filter((comment) => comment.id !== id))
  }

  const handleCommentReply = (id: string, replyContent: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id === id) {
          return {
            ...comment,
            replies: [
              ...(comment.replies || []),
              {
                id: Date.now().toString(),
                author: "Current User",
                content: replyContent,
                timestamp: new Date(),
              },
            ],
          }
        }
        return comment
      }),
    )
    setExpandedComment(null)
  }

  const handleAddComment = (content: string) => {
    if (newCommentPosition) {
      const newComment: Comment = {
        id: Date.now().toString(),
        author: "Current User",
        content,
        timestamp: new Date(),
        x: newCommentPosition.x,
        y: newCommentPosition.y,
      }
      setComments((prev) => [...prev, newComment])
      setNewCommentPosition(null)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      setNewCommentPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setExpandedComment(null)
    }
  }

  const toggleExpandComment = (id: string) => {
    setExpandedComment((prev) => {
      if (prev === id) {
        return null
      }
      return id
    })
  }

  return (
    <div className="relative w-full h-full" onClick={handleCanvasClick}>
      {comments.map((comment) => (
        <div
          key={comment.id}
          style={{
            position: "absolute",
            left: comment.x,
            top: comment.y,
            zIndex: expandedComment === comment.id ? 10 : "auto",
          }}
        >
          <CommentBubble
            id={comment.id}
            author={comment.author}
            content={comment.content}
            timestamp={comment.timestamp}
            onEdit={handleCommentEdit}
            onDelete={handleCommentDelete}
            onReply={handleCommentReply}
            isExpanded={expandedComment === comment.id}
            onToggleExpand={() => toggleExpandComment(comment.id)}
          />
        </div>
      ))}
      {newCommentPosition && (
        <div
          style={{
            position: "absolute",
            left: newCommentPosition.x,
            top: newCommentPosition.y,
          }}
        >
          <CommentInput onSubmit={handleAddComment} />
        </div>
      )}
    </div>
  )
}

