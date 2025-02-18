import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "./UserAvatar";
import { Badge } from "@/components/ui/badge";

interface StarResponse {
  success: boolean;
  data: {
    stars: Array<{
      userId: string;
      user: {
        fullName: string;
        imageUrl: string | null;
        color: string;
      };
    }>;
    userStarred: boolean;
  };
}

interface BatchStarResponse {
  success: boolean;
  data: {
    [key: string]: {
      stars: Array<{
        userId: string;
        user: {
          fullName: string;
          imageUrl: string | null;
          color: string;
        };
      }>;
      userStarred: boolean;
    };
  };
}

export function StarredAvatars({ imageId }: { imageId: number }) {
  const queryClient = useQueryClient();

  // Use the batch endpoint
  const { data: response } = useQuery<BatchStarResponse>({
    queryKey: [`/api/images/stars`, [imageId]],
    queryFn: async () => {
      const res = await fetch(`/api/images/stars?ids=${imageId}`);
      return res.json();
    },
    staleTime: 5000,
    cacheTime: 10000,
    enabled: Number.isInteger(Number(imageId)) && !imageId.toString().startsWith('pending-'),
    select: (data) => ({
      ...data,
      data: Object.entries(data.data).reduce((acc, [id, starData]) => {
        acc[id] = {
          ...starData,
          stars: Array.from(
            new Map(
              starData.stars.map(star => [star.userId, star])
            ).values()
          )
        };
        return acc;
      }, {} as BatchStarResponse['data'])
    })
  });

  const imageStars = response?.data?.[imageId]?.stars || [];
  const visibleStars = imageStars.slice(0, 3);
  const remainingCount = Math.max(0, imageStars.length - visibleStars.length);

  if (imageStars.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {visibleStars.map((star) => (
        <UserAvatar
          key={star.userId}
          name={star.user.fullName}
          imageUrl={star.user.imageUrl}
          color={star.user.color}
          size="xs"
        />
      ))}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="ml-2 bg-background/80">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}