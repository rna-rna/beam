import { ReactNode } from "react";
import { useLocation } from "wouter";
import { InlineEdit } from "@/components/InlineEdit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Share2, ChevronDown, SquareDashedMousePointer, Star, MessageSquare } from "lucide-react";

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
  selectMode?: boolean;
  setShowStarredOnly?: (value: boolean) => void;
  setShowWithComments?: (value: boolean) => void;
  setShowApproved?: (value: boolean) => void;
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
  selectMode,
  setShowStarredOnly,
  setShowWithComments,
  setShowApproved
}: LayoutProps) {
  const [location] = useLocation();
  const isGalleryPage = location.startsWith('/g/');

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4 flex items-center gap-4">
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

                {/* Filters Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Filters
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setShowStarredOnly?.(true)}>
                      <Star className="mr-2 h-4 w-4" />
                      Starred
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowWithComments?.(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      With Comments
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setShowStarredOnly?.(false);
                      setShowWithComments?.(false);
                      setShowApproved?.(false);
                    }}>
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