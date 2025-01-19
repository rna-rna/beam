import { motion } from 'framer-motion';

interface UserCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

interface CursorOverlayProps {
  cursors: UserCursor[];
}

export function CursorOverlay({ cursors }: CursorOverlayProps) {
  console.log("[CursorOverlay] cursors prop:", cursors);

  return (
    <div 
      className="fixed inset-0 pointer-events-none" 
      style={{ zIndex: 99999, backgroundColor: "rgba(255,0,0,0.05)" }}
    >
      {cursors.map((user) => {
        console.log("[CursorOverlay] Drawing user:", user.id, " x:", user.x, " y:", user.y);
        return (
          <motion.div
            key={user.id}
            className="absolute"
            initial={{ x: user.x, y: user.y }}
            animate={{ x: user.x, y: user.y }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          >
            <div style={{ width: 30, height: 30, backgroundColor: "blue" }} />
          </motion.div>
        );
      })}
    </div>
  );
}