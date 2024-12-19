import { useMemo } from "react";

interface UserAvatarProps {
  name: string;
  className?: string;
}

// Generate a consistent color based on the name
function generateColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with fixed saturation and lightness for better visibility
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export function UserAvatar({ name, className = "" }: UserAvatarProps) {
  const initial = useMemo(() => {
    return name ? name.charAt(0).toUpperCase() : "?";
  }, [name]);

  const backgroundColor = useMemo(() => {
    return generateColor(name);
  }, [name]);

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-medium shadow-sm ${className}`}
      style={{ backgroundColor }}
    >
      {initial}
    </div>
  );
}
