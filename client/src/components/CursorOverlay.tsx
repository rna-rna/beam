
import { motion } from "framer-motion";

interface UserCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastActive: number;
}

interface CursorOverlayProps {
  cursors: UserCursor[];
}

export function CursorOverlay({ cursors }: CursorOverlayProps) {
  console.log("[CursorOverlay] cursors prop:", cursors);

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 99999 }}
    >
      {cursors.map((user) => {
        console.log(
          "[CursorOverlay] Drawing user:",
          user.id,
          "x:",
          user.x,
          "y:",
          user.y
        );
        return (
          <motion.div
            key={user.id}
            className="absolute"
            initial={{ x: user.x, y: user.y }}
            animate={{ x: user.x, y: user.y }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
          >
            <div className="flex flex-col items-start">
              <div className="relative">
                <svg
                  width="24"
                  height="36"
                  viewBox="0 0 24 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-md"
                >
                  <path
                    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                    fill={user.color}
                    stroke="white"
                  />
                </svg>

                <div
                  className="absolute top-[80%] left-0 flex items-center space-x-2 rounded-full pl-1.5 pr-2.5 py-1 text-xs font-medium shadow-sm whitespace-nowrap"
                  style={{
                    backgroundColor: user.color,
                    color: "#FFFFFF",
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    <span
                      className="text-[10px]"
                      style={{ color: user.color }}
                    >
                      {user.name[0].toUpperCase()}
                    </span>
                  </div>
                  <span>{user.name}</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
