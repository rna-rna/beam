import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, FolderOpen, Image, Pencil, Plus, Share, Trash2 } from "lucide-react";
import { getR2Image } from "@/lib/r2";
import * as ReactDOM from "react-dom/client";

import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { API_URL } from "@/lib/constants";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GalleryCard } from "@/components/GalleryCard";

// Setup dayjs
dayjs.extend(relativeTime);

interface Gallery {
  id: number;
  slug: string;
  title: string;
  description?: string;
  userId: string;
  imageCount: number;
  thumbnailUrl?: string;
  isOwner: boolean;
  folderId?: number;
  lastViewedAt?: string;
  images?: string[]; // Added images array
}

export function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isListView, setIsListView] = useState(false);
  const [, setLocation] = useLocation();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: galleries = [], isLoading } = useQuery<Gallery[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/galleries`);
      if (!response.ok) {
        throw new Error("Failed to fetch galleries");
      }
      return response.json();
    },
  });

  const filteredGalleries = galleries.filter((gallery) => {
    return gallery.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleShare = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setShareModalOpen(true);
  };

  const handleRename = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setIsRenameModalOpen(true);
  };

  const handleDelete = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setIsDeleteModalOpen(true);
  };

  return (
    <DashboardLayout
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isListView={isListView}
      setIsListView={setIsListView}
      searchPlaceholder="Search projects..."
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center">
          <h2 className="text-xl font-semibold">No projects found</h2>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Create a new project to get started"}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isListView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {filteredGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              isListView={isListView}
              onShare={handleShare}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="p-4">
            <h2 className="text-lg font-semibold">Share Gallery</h2>
            {/* Add share functionality here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent>
          <div className="p-4">
            <h2 className="text-lg font-semibold">Rename Gallery</h2>
            {/* Add rename functionality here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <div className="p-4">
            <h2 className="text-lg font-semibold">Delete Gallery</h2>
            {/* Add delete functionality here */}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}