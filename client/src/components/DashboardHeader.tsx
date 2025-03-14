
import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { List, Menu, Plus, Search } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isListView: boolean;
  setIsListView: (isListView: boolean) => void;
  searchPlaceholder?: string;
  showNewGalleryButton?: boolean;
}

export function DashboardHeader({
  searchQuery,
  setSearchQuery,
  isListView,
  setIsListView,
  searchPlaceholder = "Search...",
  showNewGalleryButton = true
}: DashboardHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showNewGalleryButton && (
          <Button onClick={() => setLocation("/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Gallery
          </Button>
        )}
        <Toggle
          pressed={isListView}
          onPressedChange={setIsListView}
          aria-label="Toggle list view"
        >
          <List className="h-4 w-4" />
        </Toggle>
      </div>
    </header>
  );
}
