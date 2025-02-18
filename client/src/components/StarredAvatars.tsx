import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "./UserAvatar";

interface Props {
  imageId: number;
}

export function StarredAvatars({ imageId }: Props) {
  // Find the current image's stars in the parent gallery query data
  const stars = useQuery({
    queryKey: [`/api/galleries`],
    select: (data) => {
      const allGalleries = data || [];
      for (const gallery of allGalleries) {
        const image = gallery.images?.find(img => img.id === imageId);
        if (image) {
          return image.stars || [];
        }
      }
      return [];
    }
  });

  const visibleStars = (stars.data || []).slice(0, 3);
  const remainingCount = Math.max(0, (stars.data?.length || 0) - visibleStars.length);

  if (!stars.data?.length) return null;

  return (
    <div className="flex -space-x-2 items-center">
      {visibleStars.map((star, i) => (
        <UserAvatar
          key={`${star.userId}-${i}`}
          name={`${star.firstName || ''} ${star.lastName || ''}`.trim()}
          imageUrl={star.imageUrl}
          color={star.color}
          size="xs"
          className="border-2 border-white/40 dark:border-black"
        />
      ))}
      {remainingCount > 0 && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium border-2 border-background">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}