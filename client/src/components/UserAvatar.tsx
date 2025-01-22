
import { useUser } from "@clerk/clerk-react";
import { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string;
  imageUrl?: string;
  className?: string;
  isActive?: boolean;
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

function isClerkDefaultUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("default_avatar") || url.includes("clerk_assets");
}

export function UserAvatar({ name: propName, imageUrl: propImageUrl, className = "", isActive = false }: UserAvatarProps) {
  const { user } = useUser();
  const name = propName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const imageUrl = propImageUrl || user?.imageUrl;
  
  const initial = useMemo(() => getInitials(name), [name]);
  const backgroundColor = useMemo(() => {
    return user?.publicMetadata?.color || '#ccc';
  }, [user?.publicMetadata?.color]);

  return (
    <div className="relative group">
      <Avatar className={cn(className)}>
        {imageUrl && !isClerkDefaultUrl(imageUrl) && (
          <AvatarImage src={imageUrl} alt={name || 'User'} />
        )}
        <AvatarFallback 
          style={{ backgroundColor, color: 'white' }}
          className="font-medium"
        >
          {initial}
        </AvatarFallback>
      </Avatar>
      {isActive && (
        <span className="absolute bottom-[2px] right-[2px] block h-2 w-2 rounded-full bg-green-500 group-hover:translate-y-[-2px] transition-transform" />
      )}
    </div>
  );
}
