import { useUser } from "@clerk/clerk-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserNav } from "./UserNav";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { forwardRef } from "react";
import {
  Filter,
  Share2,
  Star,
  Moon,
  Sun,
  MessageSquare,
  SquareDashedMousePointer
} from "lucide-react";
import { cn } from "@/utils/cn";
import { InlineEdit } from "./InlineEdit";

// Create ref-forwarding wrappers for Lucide icons
const FilterIconWithRef = forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<typeof Filter>>(
  (props, ref) => <Filter ref={ref} {...props} />
);
FilterIconWithRef.displayName = 'FilterIconWithRef';

const SunWithRef = forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<typeof Sun>>(
  (props, ref) => <Sun ref={ref} {...props} />
);
SunWithRef.displayName = 'SunWithRef';

const MoonWithRef = forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<typeof Moon>>(
  (props, ref) => <Moon ref={ref} {...props} />
);
MoonWithRef.displayName = 'MoonWithRef';

interface GalleryHeaderProps {
  title: string;
  onTitleUpdate: (newTitle: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  openShareModal: () => void;
  toggleSelectMode: () => void;
  selectMode: boolean;
  showStarredOnly: boolean;
  setShowStarredOnly: (value: boolean) => void;
  showWithComments: boolean;
  setShowWithComments: (value: boolean) => void;
  setShowApproved: (value: boolean) => void;
}

export function GalleryHeader({
  title,
  onTitleUpdate,
  isDarkMode,
  toggleDarkMode,
  openShareModal,
  toggleSelectMode,
  selectMode,
  showStarredOnly,
  setShowStarredOnly,
  showWithComments,
  setShowWithComments,
  setShowApproved
}: GalleryHeaderProps) {
  const { user } = useUser();

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-sm border-b flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <InlineEdit
            value={title}
            onSave={onTitleUpdate}
            className="text-2xl font-bold"
          />

          {/* Tools Button */}
          <Button
            variant="outline"
            onClick={toggleSelectMode}
            className={cn(selectMode && "bg-accent text-accent-foreground")}
          >
            <SquareDashedMousePointer className="mr-2 h-4 w-4" />
            Tools
          </Button>

          {/* Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FilterIconWithRef className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowStarredOnly(!showStarredOnly)}>
                <Star className={`mr-2 h-4 w-4 ${showStarredOnly ? "fill-yellow-400 text-yellow-400" : ""}`} />
                Starred
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowWithComments(!showWithComments)}>
                <MessageSquare className={`mr-2 h-4 w-4 ${showWithComments ? "text-primary" : ""}`} />
                With Comments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setShowStarredOnly(false);
                setShowWithComments(false);
                setShowApproved(false);
              }}>
                Reset Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={toggleDarkMode}>
                {isDarkMode ? (
                  <MoonWithRef className="h-4 w-4" />
                ) : (
                  <SunWithRef className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Dark Mode</TooltipContent>
          </Tooltip>

          {/* Share Button */}
          <Button
            variant="default"
            onClick={openShareModal}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          {/* User Navigation */}
          <UserNav />
        </div>
      </div>
    </TooltipProvider>
  );
}
