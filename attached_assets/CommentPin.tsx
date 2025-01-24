import type React from "react"
import { Badge } from "@/components/ui/badge"
import { motion, useDragControls } from "framer-motion"

interface CommentPinProps {
  number: number
  x: number
  y: number
  onDragEnd: (x: number, y: number) => void
  onClick: () => void
}

export const CommentPin: React.FC<CommentPinProps> = ({ number, x, y, onDragEnd, onClick }) => {
  const controls = useDragControls()

  return (
    <motion.div
      drag
      dragControls={controls}
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0}
      onDragEnd={(_, info) => onDragEnd(info.point.x, info.point.y)}
      initial={{ x, y }}
      style={{ position: "absolute", x, y }}
    >
      <Badge
        variant="secondary"
        className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
        onClick={onClick}
      >
        {number}
      </Badge>
    </motion.div>
  )
}

