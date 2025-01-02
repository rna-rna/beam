
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StarData {
  id: number;
  userId: string;
  imageId: number;
  createdAt: string;
}

interface StarredAvatarsProps {
  imageId: number;
}

interface StarResponse {
  success: boolean;
  data: StarData[];
}

export function StarredAvatars({ imageId }: StarredAvatarsProps) {
  const { data: response } = useQuery<StarResponse>({
    queryKey: [`/api/images/${imageId}/stars`],
  });

  const stars = response?.data || [];
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
          <AvatarFallback>U</AvatarFallback>
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
