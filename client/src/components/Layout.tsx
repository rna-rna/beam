
import { ReactNode } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { SquarePlus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/LoginButton";
import { InlineEdit } from "@/components/InlineEdit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
  selectMode?: boolean;
  toggleSelectMode?: () => void;
}

export function Layout({ 
  children, 
  title, 
  onTitleChange, 
  actions,
  selectMode,
  toggleSelectMode 
}: LayoutProps) {
  const { isDark } = useTheme();

  return (
    <div className={cn("min-h-screen w-full", isDark ? "bg-black" : "bg-white")}>
      <div className={cn("sticky top-0 z-10 border-b", isDark ? "bg-black" : "bg-white")}>
        <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
          {title && onTitleChange ? (
            <InlineEdit
              value={title}
              onSave={onTitleChange}
              className="text-sm font-semibold"
            />
          ) : (
            <InlineEdit
              value={title}
              onSave={onTitleChange!}
              className="text-sm font-semibold"
            />
          )}

          <div className="ml-auto flex items-center gap-2">
            {toggleSelectMode && (
              <Button 
                variant="ghost" 
                onClick={toggleSelectMode}
                className={cn("text-sm", isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-100")}
              >
                {selectMode ? "Deselect" : "Tools"}
              </Button>
            )}
            {actions}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/new"}
              title="Create new gallery"
            >
              <SquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/dashboard"}
              title="Go to dashboard"
            >
              <Home className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <SignedIn>
              <UserNav />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = "/sign-up"}
                  className="text-sm"
                >
                  Sign Up
                </Button>
                <LoginButton />
              </div>
            </SignedOut>
          </div>
        </div>
      </div>
      <main className="relative">
        {children}
      </main>
    </div>
  );
}
