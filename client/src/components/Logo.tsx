
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: "h-6 w-auto",
  md: "h-8 w-auto",
  lg: "h-12 w-auto"
}

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <img 
      src="/src/assets/beam-logo-1.svg" 
      alt="Image Gallery Hub Logo" 
      className={cn(sizes[size], className)}
    />
  )
}
