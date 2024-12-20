import { ReactNode } from "react";
import { InlineEdit } from "@/components/InlineEdit";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
}

export function Layout({ children, title, onTitleChange, actions }: LayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4 flex items-center gap-4">
          {title && onTitleChange ? (
            <InlineEdit
              value={title}
              onSave={onTitleChange}
              className="text-xl font-semibold"
            />
          ) : (
            <h1 className="text-xl font-semibold">{title}</h1>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
