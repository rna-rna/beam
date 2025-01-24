
import type React from "react"

interface SpeechBubbleProps {
  children: React.ReactNode
  className?: string
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ children, className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-white rounded-full" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white transform rotate-45" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
