
import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useClickOutside } from '@/hooks/use-click-outside';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  '👍', '❤️', '😄', '🎉', '🤔', '👀', '🚀', '🔥',
  '💯', '✨', '🙌', '👏', '🎨', '💡', '💪', '🌟'
];

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <Card
      ref={ref}
      className="absolute left-full top-0 z-50 p-2 grid grid-cols-4 gap-1 bg-card shadow-lg"
      style={{ transform: 'translateY(-50%)' }}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded"
          onClick={() => {
            onEmojiSelect(emoji);
          }}
        >
          {emoji}
        </button>
      ))}
    </Card>
  );
}
