import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardPortal } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

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
  size?: "default" | "lg";
}

interface StarResponse {
  success: boolean;
  data: StarData[];
}

export function StarredAvatars({ imageId, size = "default" }: StarredAvatarsProps) {
  const { data: response } = useQuery<StarResponse>({
    queryKey: [`/api/images/${imageId}/stars`],
    staleTime: 5000,
    cacheTime: 10000,
    select: (data) => ({
      ...data,
      data: Array.from(
        new Map(
          (data?.data || []).map(star => [star.userId, star])
        ).values()
      )
    })
  });

  const stars = response?.data || [];
  const visibleStars = stars.slice(0, 3);
  const remainingCount = Math.max(0, stars.length - visibleStars.length);

  if (stars.length === 0) return null;

  const getInitials = (user?: StarData['user']) => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="relative flex items-center cursor-pointer">
          {visibleStars.map((star, index) => (
            <Avatar
              key={star.userId}
              className={`${size === "lg" ? "w-7 h-7" : "w-5 h-5"} shadow-sm ${index > 0 ? '-ml-2' : ''}`}
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
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent className="w-56 p-4 shadow-lg">
        <h4 className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1">
          <Star className="w-3 h-3" />
          Favorited by
        </h4>
        <div className="space-y-2">
          {stars.map((star) => (
            <div key={star.userId} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                {star.user?.imageUrl && <AvatarImage src={star.user.imageUrl} />}
                <AvatarFallback>{getInitials(star.user)}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium">
                {star.user?.firstName} {star.user?.lastName}
              </div>
            </div>
          ))}
        </div>
      </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}