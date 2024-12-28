import { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  name: string;
  imageUrl?: string;
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

export function UserAvatar({ name, imageUrl, className = "" }: UserAvatarProps) {
  const initial = useMemo(() => {
    return name ? name.charAt(0).toUpperCase() : "?";
  }, [name]);

  const backgroundColor = useMemo(() => {
    return generateColor(name);
  }, [name]);

  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback style={{ backgroundColor }}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}