
import { ReactNode } from "react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AnimatePresence } from "framer-motion";
import { SquarePlus, Home } from "lucide-react";
import { useLocation } from "wouter";
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
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-0 w-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-background">
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
                className="text-sm"
              >
                {selectMode ? "Deselect" : "Tools"}
              </Button>
            )}
            {actions}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/new")}
              title="Create new gallery"
            >
              <SquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
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
                  onClick={() => setLocation("/sign-up")}
                  className="text-sm"
                >
                  Sign Up
                </Button>
                <LoginButton />
              </div>
            </SignedOut>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}
