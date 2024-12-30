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
import { 
  Share2, 
  ChevronDown, 
  SquareDashedMousePointer,
  Star,
  MessageSquare,
  LayoutGrid,
  Filter
} from "lucide-react";
import { cn } from "@/utils/cn";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
  gallery?: {
    isPublic?: boolean;
    title: string;
    imageCount?: number;
  };
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  openShareModal?: () => void;
  toggleSelectionMode?: () => void;
  onFilterSelect?: (filter: string) => void;
  toggleGridView?: () => void;
  isMasonry?: boolean;
  selectMode?: boolean;
  showStarredOnly?: boolean;
  showWithComments?: boolean;
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
  selectMode,
  showStarredOnly,
  showWithComments
}: LayoutProps) {
  const [location] = useLocation();
  const isGalleryPage = location.startsWith('/g/');

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-sm border-b">
        <div className="px-6 py-4 flex items-center gap-6">
          {/* Title Section */}
          {isGalleryPage && gallery ? (
            <div className="flex items-center gap-6">
              {onTitleChange ? (
                <InlineEdit
                  value={gallery.title}
                  onSave={onTitleChange}
                  className="text-2xl font-bold"
                />
              ) : (
                <h1 className="text-2xl font-bold">{gallery.title}</h1>
              )}

              {/* Tools Button */}
              <Button
                variant="outline"
                onClick={toggleSelectionMode}
                className={cn(selectMode && "bg-accent text-accent-foreground")}
              >
                <SquareDashedMousePointer className="mr-2 h-4 w-4" />
                Tools
              </Button>

              {/* Grid View Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleGridView}
                className={cn(!isMasonry && "bg-accent text-accent-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>

              {/* Filters Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => onFilterSelect?.('starred')}
                    className={cn(showStarredOnly && "bg-accent text-accent-foreground")}
                  >
                    <Star className={`mr-2 h-4 w-4 ${showStarredOnly ? "fill-yellow-400 text-yellow-400" : ""}`} />
                    Starred
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onFilterSelect?.('comments')}
                    className={cn(showWithComments && "bg-accent text-accent-foreground")}
                  >
                    <MessageSquare className={`mr-2 h-4 w-4 ${showWithComments ? "text-primary" : ""}`} />
                    With Comments
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onFilterSelect?.('reset')}>
                    Reset Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            title && <h1 className="text-2xl font-bold">{title}</h1>
          )}

          {/* Right Side Actions */}
          <div className="ml-auto flex items-center gap-4">
            {actions}
            {isGalleryPage && (
              <Button
                variant="default"
                onClick={openShareModal}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
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