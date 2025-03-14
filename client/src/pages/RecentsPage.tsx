import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { GalleryCard } from "@/components/GalleryCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { API_URL } from "@/lib/constants";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Clock, FolderOpen, Share, Pencil, Trash2 } from "lucide-react";


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
  lastViewedAt?: string;
  sharedBy?: {
    firstName?: string;
    lastName?: string;
  };
  isPublic?: boolean;
}

export function RecentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isListView, setIsListView] = useState(false);
  const [, setLocation] = useLocation();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: recentGalleries = [], isLoading } = useQuery<Gallery[]>({
    queryKey: ["recentGalleries"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/recent-galleries`);
      return response.json();
    },
  });

  const filteredGalleries = recentGalleries.filter((gallery) => {
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
      searchPlaceholder="Search recent galleries..."
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center">
          <h2 className="text-xl font-semibold">No recent galleries found</h2>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Create a new gallery to get started"}
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