import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarredUser {
  userId: string;
  userName: string;
  userImageUrl?: string;
}

interface StarredAvatarsProps {
  imageId: number;
  className?: string;
  maxAvatars?: number;
}

export function StarredAvatars({ imageId, className, maxAvatars = 3 }: StarredAvatarsProps) {
  const { data: starredUsers = [], isLoading } = useQuery<StarredUser[]>({
    queryKey: [`/api/images/${imageId}/stars`],
    enabled: !!imageId,
  });

  if (isLoading || starredUsers.length === 0) return null;

  const visibleUsers = starredUsers.slice(0, maxAvatars);
  const remainingCount = Math.max(0, starredUsers.length - maxAvatars);

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {visibleUsers.map((user, index) => (
                <Avatar
                  key={user.userId}
                  className={cn(
                    "h-6 w-6 border-2 border-background",
                    index > 0 && "-ml-2"
                  )}
                >
                  {user.userImageUrl ? (
                    <AvatarImage src={user.userImageUrl} alt={user.userName} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium -ml-2 border-2 border-background">
                  +{remainingCount}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              {starredUsers.map(user => user.userName).join(", ")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
