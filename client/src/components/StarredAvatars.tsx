
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StarData {
  id: number;
  userId: string;
  imageId: number;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  };
}

interface StarredAvatarsProps {
  imageId: number;
  optimisticStars?: StarData[];
}

interface StarResponse {
  success: boolean;
  data: StarData[];
}

export function StarredAvatars({ imageId, optimisticStars }: StarredAvatarsProps) {
  const { data: response } = useQuery<StarResponse>({
    queryKey: [`/api/images/${imageId}/stars`],
  });

  const stars = optimisticStars || response?.data || [];

  const stars = response?.data || [];
  const visibleStars = stars.slice(0, 3);
  const remainingCount = stars.length - visibleStars.length;

  if (stars.length === 0) return null;

  const getInitials = (user?: StarData['user']) => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <div className="relative flex items-center">
      {visibleStars.map((star, index) => (
        <Avatar
          key={star.id}
          className={`w-6 h-6 border border-background shadow-sm ${index > 0 ? '-ml-2' : ''}`}
        >
          {star.user?.imageUrl && <AvatarImage src={star.user.imageUrl} />}
          <AvatarFallback>{getInitials(star.user)}</AvatarFallback>
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
