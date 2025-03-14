
import { ReactNode, useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isListView: boolean;
  setIsListView: (isListView: boolean) => void;
  searchPlaceholder?: string;
  showNewGalleryButton?: boolean;
}

export function DashboardLayout({
  children,
  searchQuery,
  setSearchQuery,
  isListView,
  setIsListView,
  searchPlaceholder = "Search...",
  showNewGalleryButton = true
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex h-full min-h-0">
        {/* Sidebar for desktop */}
        <aside className="hidden w-64 border-r border-border md:block">
          <DashboardSidebar />
        </aside>
        
        {/* Main content area */}
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="border-b border-border">
            <div className="flex h-16 items-center gap-4 px-4">
              {/* Mobile menu button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="md:hidden">
                  <DashboardSidebar />
                </SheetContent>
              </Sheet>
              
              {/* Dashboard header with search and view controls */}
              <div className="flex-1">
                <DashboardHeader
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isListView={isListView}
                  setIsListView={setIsListView}
                  searchPlaceholder={searchPlaceholder}
                  showNewGalleryButton={showNewGalleryButton}
                />
              </div>
            </div>
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
