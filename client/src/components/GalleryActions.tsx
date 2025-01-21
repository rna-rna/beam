import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SignedIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GalleryRole } from '@/types/gallery';
import { PencilRuler } from 'lucide-react';

interface GalleryActionsProps {
  gallery: any;
  userRole?: GalleryRole | string | null;
  isDark?: boolean;
}

function GalleryActions({ gallery, userRole = 'View', isDark = false }: GalleryActionsProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
  };

  const canManageGallery = (role: string | null) => role ? ['owner', 'Edit'].includes(role) : false;
  const canStar = (role: string | null) => role ? ['owner', 'Edit', 'Comment'].includes(role) : false;
  const canComment = (role: string | null) => role ? ['owner', 'Edit', 'Comment'].includes(role) : false;
  const showStar = (role: string | null) => role ? ['owner', 'Edit', 'Comment'].includes(role) : false;

  return (
    <div>
      {!selectMode && canStar(userRole) && (
        <motion.div
          className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.8 }}
        >
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bgbackground/80 hover:bg-background shadow-sm backdrop-blur-sm"
            onClick={(e) => {
              // ... your star button logic ...
            }}
          >
            {/* ...Star icon ... */}
          </Button>
        </motion.div>
      )}

      <SignedIn>
        {canComment(userRole) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isDark
                ? "text-white hover:bg-white/10"
                : "text-zinc-800 hover:bg-zinc-200",
              isCommentPlacementMode && "bg-primary/20",
            )}
            onClick={(e) => {
              // ... your comment button logic ...
            }}
          >
            {/* ...Comment icon... */}
          </Button>
        )}
      </SignedIn>

      {canManageGallery(userRole) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={selectMode}
              onPressedChange={toggleSelectMode}
              className={cn(
                "h-9 w-9",
                isDark
                  ? "text-white hover:bg-white/10 data-[state=on]:bg-white/20 data-[state=on]:text-white data-[state=on]:ring-2 data-[state=on]:ring-white/20"
                  : "text-gray-800 hover:bg-gray-200 data-[state=on]:bg-accent/30 data-[state=on]:text-accent-foreground data-[state=on]:ring-2 data-[state=on]:ring-accent",
              )}
            >
              <PencilRuler className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            {selectMode ? "Done" : "Select Images"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default GalleryActions;