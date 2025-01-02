
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Star {
  id: number;
  user: {
    imageUrl?: string;
    firstName?: string;
  };
}

interface StarredAvatarsProps {
  imageId: number;
}

export function StarredAvatars({ imageId }: StarredAvatarsProps) {
  const { data: stars = [] } = useQuery<Star[]>({
    queryKey: [`/api/images/${imageId}/stars`],
  });

  const visibleStars = stars.slice(0, 3);
  const remainingCount = stars.length - visibleStars.length;

  if (stars.length === 0) return null;

  return (
    <div className="relative flex items-center">
      {visibleStars.map((star, index) => (
        <Avatar
          key={star.id}
          className={`w-6 h-6 border-2 border-background shadow-sm ${index > 0 ? '-ml-2' : ''}`}
        >
          <AvatarImage src={star.user.imageUrl} alt={star.user.firstName || "User"} />
          <AvatarFallback>{star.user.firstName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium -ml-2">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
