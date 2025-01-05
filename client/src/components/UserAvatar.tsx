
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
    <div className="relative">
      <Avatar className={cn(className, isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
        {imageUrl && <AvatarImage src={imageUrl} alt={name || 'User'} />}
        <AvatarFallback style={{ backgroundColor, color: 'white' }}>
          {initial}
        </AvatarFallback>
      </Avatar>
      {isActive && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
      )}
    </div>
  );
}
