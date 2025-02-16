import React from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Share, Grid } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

interface GalleryHeaderProps {
  gallery: any;
  onGridToggle: () => void;
  onShare: () => void;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

export default function GalleryHeader({
  gallery,
  onGridToggle,
  onShare,
  onHeaderActionsChange,
}: GalleryHeaderProps) {
  const headerActions = (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg", "bg-white/90 dark:bg-black/90")}>
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {gallery.activeUsers?.map((member: any) => (
            <UserAvatar
              key={member.userId}
              name={member.name}
              imageUrl={member.avatar}
              color={member.color || "#ccc"}
              size="xs"
              isActive={true}
              className="border-2 border-white/40 dark:border-black hover:translate-y-[-2px] transition-transform"
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onGridToggle}>
                <Grid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid/Masonry</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onShare}>
                <Share className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share Gallery</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  onHeaderActionsChange?.(headerActions);

  return <header className="p-4">{headerActions}</header>;
}
