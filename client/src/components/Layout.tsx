import { ReactNode } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/LoginButton";
import { InlineEdit } from "@/components/InlineEdit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import { UserAvatar } from "@/components/UserAvatar";
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
    <div className={cn("min-h-screen w-full", isDark ? "bg-black/90" : "bg-background")}>
      <div className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", isDark ? "bg-black/80" : "bg-background/80")}>
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          {title && onTitleChange ? (
            <InlineEdit
              value={title}
              onSave={onTitleChange}
              className="text-l font-semibold"
            />
          ) : (
            <InlineEdit
              value={title}
              onSave={onTitleChange!}
              className="text-l font-semibold"
            />
          )}

          <div className="ml-auto flex items-center gap-4">
            {toggleSelectMode && (
              <Button 
                variant="ghost" 
                onClick={toggleSelectMode}
                className={cn("", isDark ? "text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-200")}
              >
                {selectMode ? "Deselect" : "Tools"}
              </Button>
            )}
            {actions}
            <ThemeToggle />
            <SignedIn>
              <UserAvatar />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = "/sign-up"}
                  className={cn("", isDark ? "" : "")}
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