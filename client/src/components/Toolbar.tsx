import { motion } from "framer-motion";
import { Star, MessageCircle } from "lucide-react";

interface ToolbarProps {
  isStarred: boolean;
  onStarToggle: () => void;
  onComment: () => void;
  scaleValue: any; // MotionValue<number>
}

export function Toolbar({ isStarred, onStarToggle, onComment, scaleValue }: ToolbarProps) {
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full shadow-lg"
      style={{
        width: '40%',
        opacity: scaleValue.get() > 1 ? 0.3 : 1,
        pointerEvents: scaleValue.get() > 1 ? 'none' : 'auto',
      }}
    >
      <div className="flex justify-center gap-8 items-center h-12">
        <motion.button
          onClick={(e) => {
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
            touchAction: 'manipulation'
          }}
        >
          <Star 
            className="w-6 h-6"
            fill={isStarred ? "currentColor" : "none"}
          />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onComment();
          }}
          whileTap={{ scale: 0.85 }}
          className="text-white/90 hover:text-white transition-colors"
          style={{ 
            pointerEvents: 'auto',
            touchAction: 'manipulation'
          }}
        >
          <MessageCircle className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
