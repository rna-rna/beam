import { motion, MotionValue } from "framer-motion";
import { Star, MessageCircle } from "lucide-react";

interface ToolbarProps {
  isStarred: boolean;
  onStarToggle: () => void;
  onComment: () => void;
  scaleValue: MotionValue<number>;
}

export function Toolbar({ isStarred, onStarToggle, onComment, scaleValue }: ToolbarProps) {
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full shadow-lg"
      style={{
        width: '40%',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      animate={{
        opacity: scaleValue.get() > 1 ? 0.3 : 1
      }}
    >
      <div className="flex justify-center gap-8 items-center h-12 pointer-events-auto">
        <div className="relative">
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStarToggle();
            }}
            whileTap={{ scale: 0.85 }}
            className={`transition-colors ${
              isStarred
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-white/90 hover:text-white'
            }`}
            style={{ 
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              position: 'relative',
              zIndex: 20
            }}
          >
            <Star 
              className="w-6 h-6"
              fill={isStarred ? "currentColor" : "none"}
            />
          </motion.button>
        </div>

        <div className="relative">
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onComment();
            }}
            whileTap={{ scale: 0.85 }}
            className="text-white/90 hover:text-white transition-colors"
            style={{ 
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              position: 'relative',
              zIndex: 20
            }}
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}