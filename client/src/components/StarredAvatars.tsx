
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardPortal } from "@/components/ui/hover-card";
import { Star } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useUser } from "@clerk/clerk-react";

interface StarData {
  id: number;
  userId: string;
  imageId: number;
  createdAt: string;
  user?: {
    fullName: string;
    imageUrl?: string;
    color?: string;
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
  const { user } = useUser();
  const queryClient = useQueryClient();

  const toggleStarMutation = useMutation({
    mutationFn: async ({ imageId, isStarred }: { imageId: number; isStarred: boolean }) => {
      if (!imageId || String(imageId).startsWith('pending-')) {
        return { success: false, message: 'Cannot star pending image' };
      }
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isStarred })
      });
      return res.json();
    },
    onMutate: async ({ imageId, isStarred }) => {
      await queryClient.cancelQueries([`/api/images/${imageId}/stars`]);
      const previousStars = queryClient.getQueryData([`/api/images/${imageId}/stars`]);

      queryClient.setQueryData([`/api/images/${imageId}/stars`], (old: any) => {
        if (!old) return { success: true, data: [] };
        const newData = [...old.data];

        if (!isStarred) {
          newData.push({
            userId: user?.id,
            user: {
              fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
              imageUrl: user?.imageUrl,
              color: user?.publicMetadata?.color,
            }
          });
        } else {
          return { success: true, data: newData.filter(s => s.userId !== user?.id) };
        }

        return { ...old, data: newData };
      });

      return { previousStars };
    },
    onError: (err, { imageId }, context) => {
      if (context?.previousStars) {
        queryClient.setQueryData([`/api/images/${imageId}/stars`], context.previousStars);
      }
    },
    onSettled: ({ imageId }) => {
      queryClient.invalidateQueries([`/api/images/${imageId}/stars`]);
    },
  });

  if (!imageId || String(imageId).startsWith('pending-')) {
    return null;
  }

  if (!imageId || String(imageId).startsWith('pending-')) {
    return null;
  }

  const { data: response } = useQuery<StarResponse>({
    queryKey: [`/api/images/${imageId}/stars`],
    staleTime: 30000,
    cacheTime: 60000,
    enabled: Number.isInteger(Number(imageId)) && imageId > 0,
    select: (data) => ({
      success: true,
      data: Array.from(
        new Map(
          (data?.data || []).map(star => [star.userId, star])
        ).values()
      )
    }),
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const stars = response?.data || [];
  const visibleStars = stars.slice(0, 3);
  const remainingCount = Math.max(0, stars.length - visibleStars.length);

  if (stars.length === 0) return null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="relative flex items-center cursor-pointer">
          {visibleStars.map((star) => (
            <UserAvatar
              key={star.userId}
              name={star.user?.fullName || 'Unknown User'}
              imageUrl={star.user?.imageUrl}
              color={star.user?.color}
              size="sm"
              className="shadow-sm -ml-2 first:ml-0"
            />
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
                <UserAvatar
                  name={star.user?.fullName || 'Unknown User'}
                  imageUrl={star.user?.imageUrl}
                  color={star.user?.color}
                  className="h-8 w-8"
                />
                <div className="text-sm font-medium">
                  {star.user?.fullName || 'Unknown User'}
                </div>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
