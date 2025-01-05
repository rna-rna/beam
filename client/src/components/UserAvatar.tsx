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

export function UserAvatar({ name: propName, imageUrl, className = "", isActive = false }: UserAvatarProps) {
  const { user } = useUser();
  const name = propName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  
  const initial = useMemo(() => {
    return name ? name.charAt(0).toUpperCase() : "?";
  }, [name]);

  const backgroundColor = useMemo(() => {
    return user?.publicMetadata?.avatarColor || '#ccc';
  }, [user?.publicMetadata?.avatarColor]);

  return (
    <div className="relative group">
      <Avatar className={cn(className)}>
        {imageUrl && <AvatarImage src={imageUrl} alt={name || 'User'} />}
        <AvatarFallback style={{ backgroundColor, color: 'white' }}>
          {initial}
        </AvatarFallback>
      </Avatar>
      {isActive && (
        <span className="absolute bottom-[2px] right-[2px] block h-2 w-2 rounded-full bg-green-500 group-hover:translate-y-[-2px] transition-transform" />
      )}
    </div>
  );
}