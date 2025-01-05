
import { useUser } from "@clerk/clerk-react";
import { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string;
  imageUrl?: string;
  className?: string;
}

export function UserAvatar({ name: propName, imageUrl, className = "" }: UserAvatarProps) {
  const { user } = useUser();
  const name = propName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  
  const initial = useMemo(() => {
    return name ? name.charAt(0).toUpperCase() : "?";
  }, [name]);

  const backgroundColor = useMemo(() => {
    return user?.publicMetadata?.avatarColor || '#ccc';
  }, [user?.publicMetadata?.avatarColor]);

  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name || 'User'} />}
      <AvatarFallback style={{ backgroundColor, color: 'white' }}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
