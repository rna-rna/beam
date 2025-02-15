
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
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="shrink-0 border-b bg-background">
        <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="mr-2">
            <svg width="25" height="25" viewBox="0 0 700 700" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_123_74)">
                <rect width="700" height="700" rx="85.5555" fill="#D9D9D9"/>
                <path d="M561.238 356.735C422.897 388.503 388.928 422.372 357.071 560.336C355.38 567.672 344.886 567.672 343.195 560.336C311.338 422.378 277.375 388.503 139.028 356.735C131.671 355.048 131.671 344.584 139.028 342.897C277.375 311.128 311.345 277.253 343.201 139.295C344.893 131.959 355.386 131.959 357.078 139.295C388.934 277.253 422.897 311.128 561.245 342.897C568.601 344.584 568.601 355.048 561.245 356.735H561.238Z" fill="url(#paint0_radial_123_74)"/>
              </g>
              <defs>
                <radialGradient id="paint0_radial_123_74" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(350.136 349.816) rotate(90) scale(216.022 216.626)">
                  <stop stopColor="#D52A2A"/>
                  <stop offset="0.485" stopColor="#FF52EE"/>
                </radialGradient>
                <clipPath id="clip0_123_74">
                  <rect width="700" height="700" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </Button>
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
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}
