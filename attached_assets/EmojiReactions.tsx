import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡"]

interface EmojiReactionsProps {
  commentId: string
}

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({ commentId }) => {
  const [reactions, setReactions] = useState<Record<string, number>>({})

  const addReaction = (emoji: string) => {
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }))
    // Here you would typically send this update to your backend
  }

  return (
    <div className="flex items-center space-x-2">
      {Object.entries(reactions).map(([emoji, count]) => (
        <Badge key={emoji} variant="secondary" className="text-xs">
          {emoji} {count}
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0">
            +
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1">
          <div className="flex space-x-1">
            {emojis.map((emoji) => (
              <Button key={emoji} variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => addReaction(emoji)}>
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

