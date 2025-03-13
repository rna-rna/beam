
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
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
  gallerySlug: string;
  size?: "default" | "lg";
}

interface StarResponse {
  success: boolean;
  data: Record<number, {
    stars: StarData[];
    userStarred: boolean;
  }>;
}

export function StarredAvatars({ imageId, size = "default" }: StarredAvatarsProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const params = useParams();
  const gallerySlug = params?.slug;

  // Single early return for invalid/pending images or missing gallery
  if (!imageId || !Number.isInteger(Number(imageId)) || imageId <= 0 || String(imageId).startsWith('pending-') || !gallerySlug) {
    return null;
  }

  const toggleStarMutation = useMutation({
    mutationFn: async ({ imageId, isStarred }: { imageId: number; isStarred: boolean }) => {
      const res = await fetch(`/api/images/${imageId}/star`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update star status');
      }
      
      return data;
    },
    onMutate: async ({ imageId, isStarred }) => {
      await queryClient.cancelQueries([`/api/galleries/${gallerySlug}/starred`]);
      const previousData = queryClient.getQueryData([`/api/galleries/${gallerySlug}/starred`]);

      queryClient.setQueryData([`/api/galleries/${gallerySlug}/starred`], (old: any) => {
        if (!old?.data) return old;
        const newData = { ...old.data };
        
        if (!newData[imageId]) {
          newData[imageId] = { stars: [], userStarred: false };
        }

        if (!isStarred) {
          newData[imageId].stars.push({
            userId: user?.id,
            user: {
              fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
              imageUrl: user?.imageUrl,
              color: user?.publicMetadata?.color,
            }
          });
          newData[imageId].userStarred = true;
        } else {
          newData[imageId].stars = newData[imageId].stars.filter(s => s.userId !== user?.id);
          newData[imageId].userStarred = false;
        }

        return { ...old, data: newData };
      });

      return { previousData };
    },
    onError: (err, { imageId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([`/api/galleries/${gallerySlug}/starred`], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries([`/api/galleries/${gallerySlug}/starred`]);
    },
  });

  const { data: response } = useQuery<StarResponse>({
    queryKey: [`/api/galleries/${gallerySlug}/starred`],
    staleTime: 30000,
    cacheTime: 60000,
    enabled: true
  });

  const imageStars = response?.data?.[imageId]?.stars || [];
  if (imageStars.length === 0) return null;

  const visibleStars = imageStars.slice(0, 3);
  const remainingCount = Math.max(0, imageStars.length - visibleStars.length);

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
          
          <div className="space-y-2">
            {imageStars.map((star) => (
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
