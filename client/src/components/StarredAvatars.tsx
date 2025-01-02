
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarredAvatarsProps {
  imageId: number;
  className?: string;
}

export function StarredAvatars({ imageId, className }: StarredAvatarsProps) {
  const { data: stars = [] } = useQuery([`/api/images/${imageId}/stars`]);

  const visibleStars = stars.slice(0, 3);
  const remainingCount = stars.length - visibleStars.length;

  if (stars.length === 0) return null;

  return (
    <div className={cn("relative flex items-center", className)}>
      {visibleStars.map((star, index) => (
        <Avatar
          key={star.id}
          className={cn(
            "w-6 h-6 border-2 border-background shadow-sm",
            index > 0 && "-ml-2"
          )}
        >
          <AvatarImage src={star.user.imageUrl} alt={star.user.firstName || "User"} />
          <AvatarFallback>
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background shadow-sm -ml-2"
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
