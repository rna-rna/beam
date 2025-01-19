
'use client'

import { motion } from 'framer-motion'

interface UserCursor {
  id: string
  name: string
  color: string 
  x: number
  y: number
}

interface CursorOverlayProps {
  cursors: UserCursor[]
}

export function CursorOverlay({ cursors }: CursorOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.id}
          className="absolute"
          initial={{ x: cursor.x, y: cursor.y }}
          animate={{ x: cursor.x, y: cursor.y }}
          transition={{ type: "spring", damping: 20, stiffness: 400 }}
        >
          {/* Cursor */}
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
                fill={cursor.color}
                stroke="white"
              />
            </svg>

            {/* Name Label */}
            <div 
              className="absolute left-4 top-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap shadow-sm"
              style={{ backgroundColor: cursor.color, color: '#FFFFFF' }}
            >
              {cursor.name}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
