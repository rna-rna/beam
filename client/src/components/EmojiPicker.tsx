
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { useClickOutside } from '@/hooks/use-click-outside';
import { Plus } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const FREQUENT_EMOJIS = ['👍', '❤️', '😄', '🎉', '👀', '🔥', '✨', '👏'];

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFullPicker, setShowFullPicker] = useState(false);
  useClickOutside(ref, onClose);

  return (
    <AnimatePresence>
      <motion.div 
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute left-full top-0 z-50 p-2 bg-card shadow-lg rounded-lg"
        style={{ transform: 'translateY(-50%)' }}
      >
        <div className="flex gap-1">
          {FREQUENT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
            onClick={() => setShowFullPicker(!showFullPicker)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {showFullPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t mt-2">
                <Picker 
                  data={data} 
                  onEmojiSelect={(emoji: any) => {
                    onEmojiSelect(emoji.native);
                    onClose();
                  }}
                  theme="light"
                  skinTonePosition="none"
                  previewPosition="none"
                  searchPosition="none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
