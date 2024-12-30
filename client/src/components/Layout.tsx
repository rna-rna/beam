import { ReactNode } from "react";
import { useLocation } from "wouter";
import { InlineEdit } from "@/components/InlineEdit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  Share2, 
  ChevronDown, 
  SquareDashedMousePointer,
  Star,
  MessageSquare,
  GridIcon,
  Filter
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
  // Gallery-specific props
  gallery?: {
    isPublic?: boolean;
    title: string;
  };
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  openShareModal?: () => void;
  toggleSelectionMode?: () => void;
  onFilterSelect?: (filter: string) => void;
  toggleGridView?: () => void;
  isMasonry?: boolean;
  selectMode?: boolean;
}

export function Layout({
  children,
  title,
  onTitleChange,
  actions,
  gallery,
  isDarkMode,
  toggleDarkMode,
  openShareModal,
  toggleSelectionMode,
  onFilterSelect,
  toggleGridView,
  isMasonry,
  selectMode
}: LayoutProps) {
  const [location] = useLocation();
  const isGalleryPage = location.startsWith('/g/');

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4 flex items-center gap-4">
          {/* Title Section */}
          {isGalleryPage && gallery ? (
            <>
              {onTitleChange ? (
                <InlineEdit
                  value={gallery.title}
                  onSave={onTitleChange}
                  className="text-xl font-semibold"
                />
              ) : (
                <h1 className="text-xl font-semibold">{gallery.title}</h1>
              )}

              {/* Gallery-specific Features */}
              <div className="flex items-center gap-4">
                {/* Tools Button */}
                <Button
                  variant="outline"
                  onClick={toggleSelectionMode}
                  className={selectMode ? "bg-accent text-accent-foreground" : ""}
                >
                  <SquareDashedMousePointer className="mr-2 h-4 w-4" />
                  Tools
                </Button>

                {/* Grid View Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleGridView}
                      className={isMasonry ? "" : "bg-accent"}
                    >
                      <GridIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Toggle Grid View
                  </TooltipContent>
                </Tooltip>

                {/* Filters Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onFilterSelect?.('starred')}>
                      <Star className="mr-2 h-4 w-4" />
                      Starred
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFilterSelect?.('comments')}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      With Comments
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onFilterSelect?.('reset')}>
                      Reset Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Share Button */}
                <Button variant="default" onClick={openShareModal} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </>
          ) : (
            title && <h1 className="text-xl font-semibold">{title}</h1>
          )}

          {/* Right Side Actions */}
          <div className="ml-auto flex items-center gap-4">
            {actions}
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </div>
      <main className="relative">
        {children}
      </main>
    </div>
  );
}