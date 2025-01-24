
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const defaultEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface EmojiReactionsProps {
  commentId: string;
  imageId: number;
}

export function EmojiReactions({ commentId, imageId }: EmojiReactionsProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: reactions = {} } = useQuery({
    queryKey: [`/api/comments/${commentId}/reactions`],
    enabled: !!commentId
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      if (!res.ok) throw new Error('Failed to toggle reaction');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/comments/${commentId}/reactions`]);
    }
  });

  const handleToggleReaction = (emoji: string) => {
    if (!user) return;
    toggleReactionMutation.mutate(emoji);
  };

  return (
    <div className="flex items-center space-x-1">
      {Object.entries(reactions).map(([emoji, users]) => (
        <Badge 
          key={emoji}
          variant="secondary" 
          className={cn(
            "text-xs cursor-pointer transition-colors",
            users.includes(user?.id) && "bg-primary/20"
          )}
          onClick={() => handleToggleReaction(emoji)}
        >
          {emoji} {users.length}
        </Badge>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 rounded-full p-0"
            disabled={!user}
          >
            +
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex flex-wrap gap-1">
            {defaultEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleToggleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
