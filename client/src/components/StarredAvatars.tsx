
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export const StarredAvatars = ({ imageId }: { imageId: number }) => {
  const { data: stars = [] } = useQuery([`/api/images/${imageId}/stars`]);

  if (!stars.length) return null;

  const visibleStars = stars.slice(0, 3);
  const remainingStars = stars.length - visibleStars.length;

  return (
    <HoverCard>
      <HoverCardTrigger className="flex -space-x-2">
        {visibleStars.map((star, index) => (
          <Avatar
            key={star.userId}
            className={`w-6 h-6 shadow-sm ${index > 0 ? '-ml-2' : ''}`}
          >
            {star.user?.imageUrl && <AvatarImage src={star.user.imageUrl} />}
            <AvatarFallback>{getInitials(star.user)}</AvatarFallback>
          </Avatar>
        ))}
        {remainingStars > 0 && (
          <div className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs shadow-sm">
            +{remainingStars}
          </div>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-4">
        <h4 className="text-sm font-semibold mb-2">Favorited by:</h4>
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
    </HoverCard>
  );
};
